import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Resume, User
from ..schemas import ResumeRead

router = APIRouter(prefix="/resume", tags=["Resume"])

UPLOAD_DIR = Path("uploads/resumes")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 5 * 1024 * 1024


@router.post("/upload", response_model=ResumeRead)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF resumes are supported."
        )

    content = await file.read()

    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Resume exceeds 5 MB limit."
        )

    unique_name = f"{uuid.uuid4()}.pdf"
    file_path = UPLOAD_DIR / unique_name

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    resume = Resume(
        user_id=current_user.id,
        filename=file.filename,
        file_path=str(file_path)
    )

    db.add(resume)
    db.commit()
    db.refresh(resume)

    return resume