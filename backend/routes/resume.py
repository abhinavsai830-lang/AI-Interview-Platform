from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)

from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Resume, User
from ..services.profile_builder import (
    GROQ_MODEL,
    build_candidate_profile,
)
from ..services.profile_persistence import (
    persist_candidate_profile,
)
from ..services.resume_parser import (
    extract_resume_text,
)
from ..services.resume_storage import (
    delete_resume_file,
    save_resume_file,
    validate_resume_metadata,
)


router = APIRouter(
    prefix="/resume",
    tags=["resume"],
)


# ============================================================
# UPLOAD RESUME
# ============================================================

@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
)
def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Upload a candidate resume, extract its text,
    build a structured candidate profile, and persist it.
    """

    # --------------------------------------------------------
    # 1. Validate upload metadata
    # --------------------------------------------------------

    try:
        validate_resume_metadata(
            filename=file.filename,
            content_type=file.content_type,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    # --------------------------------------------------------
    # 2. Store uploaded file
    # --------------------------------------------------------

    try:
        storage_result = save_resume_file(
            file
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    stored_path = storage_result[
        "file_path"
    ]

    # --------------------------------------------------------
    # 3. Extract text from PDF
    # --------------------------------------------------------

    try:
        extracted_text = extract_resume_text(
            stored_path
        )

    except (
        FileNotFoundError,
        ValueError,
    ) as exc:

        delete_resume_file(
            stored_path
        )

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    # --------------------------------------------------------
    # 4. Create Resume database record
    # --------------------------------------------------------

    resume = Resume(
        user_id=current_user.id,
        original_filename=file.filename,
        stored_filename=(
            storage_result[
                "stored_filename"
            ]
        ),
        file_path=stored_path,
        content_type=file.content_type,
        file_size=(
            storage_result[
                "file_size"
            ]
        ),
        file_hash=(
            storage_result[
                "file_hash"
            ]
        ),
        extracted_text=extracted_text,
    )

    try:
        db.add(resume)

        db.commit()

        db.refresh(resume)

    except Exception as exc:
        db.rollback()

        delete_resume_file(
            stored_path
        )

        raise HTTPException(
            status_code=500,
            detail="Resume could not be saved.",
        ) from exc

    # --------------------------------------------------------
    # 5. Build candidate profile using LLM
    # --------------------------------------------------------

    try:
        candidate_profile = (
            build_candidate_profile(
                extracted_text
            )
        )

    except (
        ValueError,
        RuntimeError,
    ) as exc:

        raise HTTPException(
            status_code=502,
            detail=(
                "Resume uploaded successfully, "
                "but candidate profile generation failed. "
                "Please retry."
            ),
        ) from exc

    # --------------------------------------------------------
    # 6. Persist candidate profile
    # --------------------------------------------------------

    try:
        profile_record = (
            persist_candidate_profile(
                db=db,
                resume_id=resume.id,
                profile=candidate_profile,
                model_name=GROQ_MODEL,
            )
        )

    except (
        ValueError,
        RuntimeError,
    ) as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Candidate profile was generated "
                "but could not be saved."
            ),
        ) from exc

    # --------------------------------------------------------
    # 7. Return complete result
    # --------------------------------------------------------

    return {
        "success": True,

        "resume": {
            "resume_id": resume.id,
            "filename": (
                resume.original_filename
            ),
            "file_size": resume.file_size,
            "content_type": resume.content_type,
            "uploaded_at": resume.uploaded_at,
            "text_extracted": True,
            "text_length": len(
                extracted_text
            ),
        },

        "candidate_profile": {
            "profile_id": profile_record.id,
            "schema_version": (
                profile_record.schema_version
            ),
            "model_name": (
                profile_record.model_name
            ),
            "generated_at": (
                profile_record.generated_at
            ),
            "profile": candidate_profile.model_dump(),
        },
    }