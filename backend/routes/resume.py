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
    Upload a candidate resume.

    Flow:

        authenticate user
            ↓
        validate metadata
            ↓
        save file
            ↓
        create database record
            ↓
        return public metadata
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
    # 2. Save file
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

    # --------------------------------------------------------
    # 3. Create Resume database record
    # --------------------------------------------------------

    resume = Resume(
        user_id=current_user.id,
        original_filename=file.filename,
        stored_filename=(
            storage_result["stored_filename"]
        ),
        file_path=(
            storage_result["file_path"]
        ),
        content_type=file.content_type,
        file_size=(
            storage_result["file_size"]
        ),
        file_hash=(
            storage_result["file_hash"]
        ),
    )

    try:

        db.add(resume)

        db.commit()

        db.refresh(resume)

    except Exception:

        db.rollback()

        delete_resume_file(
            storage_result["file_path"]
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Resume could not be saved."
            ),
        )

    # --------------------------------------------------------
    # 4. Return public metadata
    # --------------------------------------------------------

    return {
        "success": True,
        "resume_id": resume.id,
        "filename": resume.original_filename,
        "file_size": resume.file_size,
        "content_type": resume.content_type,
        "uploaded_at": resume.uploaded_at,
    }