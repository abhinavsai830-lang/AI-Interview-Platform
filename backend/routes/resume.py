# backend/routes/resume.py

import json
import os
import shutil
from pathlib import Path

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
from ..services.profile_builder import build_candidate_profile
from ..services.resume_parser import extract_resume_text


router = APIRouter(
    prefix="/resume",
    tags=["Resume"],
)

UPLOAD_DIR = Path("uploads/resumes")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ----------------------------------------------------
    # Validate PDF
    # ----------------------------------------------------

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF resumes are supported.",
        )

    # ----------------------------------------------------
    # Save PDF
    # ----------------------------------------------------

    filename = f"user_{current_user.id}_{file.filename}"
    file_path = UPLOAD_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # ----------------------------------------------------
    # Extract resume text
    # ----------------------------------------------------

    extracted_text = extract_resume_text(str(file_path))

    # ----------------------------------------------------
    # Build structured profile using LLM
    # ----------------------------------------------------

    candidate_profile = build_candidate_profile(
        extracted_text
    )

    # ----------------------------------------------------
    # Replace old resume (keep latest)
    # ----------------------------------------------------

    old_resume = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .first()
    )

    if old_resume:

        if os.path.exists(old_resume.file_path):
            os.remove(old_resume.file_path)

        db.delete(old_resume)
        db.commit()

    # ----------------------------------------------------
    # Save to database
    # ----------------------------------------------------

    resume = Resume(
        user_id=current_user.id,
        filename=file.filename,
        file_path=str(file_path),
        extracted_text=extracted_text,
        profile_json=json.dumps(candidate_profile),
    )

    db.add(resume)
    db.commit()
    db.refresh(resume)

    return {
        "success": True,
        "message": "Resume uploaded successfully.",
        "resume_id": resume.id,
        "characters_extracted": len(extracted_text),
        "detected_skills": candidate_profile.get("skills", []),
        "detected_projects": len(
            candidate_profile.get("projects", [])
        ),
    }