from __future__ import annotations

import hashlib
import os
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile


# ============================================================
# CONFIGURATION
# ============================================================

MAX_RESUME_SIZE = 5 * 1024 * 1024  # 5 MB
CHUNK_SIZE = 1024 * 1024            # 1 MB


BASE_DIR = Path(__file__).resolve().parents[2]

RESUME_STORAGE_DIR = (
    BASE_DIR
    / "storage"
    / "resumes"
)


# ============================================================
# VALIDATE RESUME METADATA
# ============================================================

def validate_resume_metadata(
    filename: str | None,
    content_type: str | None,
) -> None:
    """
    Validate basic upload metadata.

    The actual PDF signature is validated later while reading
    the uploaded bytes.
    """

    if not filename:
        raise ValueError(
            "A resume file is required."
        )

    extension = Path(filename).suffix.lower()

    if extension != ".pdf":
        raise ValueError(
            "Only PDF resume files are supported."
        )

    if content_type != "application/pdf":
        raise ValueError(
            "The uploaded file must have PDF content type."
        )


# ============================================================
# SAVE RESUME FILE
# ============================================================

def save_resume_file(
    upload_file: UploadFile,
) -> dict[str, str | int]:
    """
    Persist the uploaded resume to private server storage.

    The file is written incrementally rather than loading the
    entire upload into memory.

    Returns:
        stored_filename
        file_path
        file_size
        file_hash
    """

    if not upload_file.filename:
        raise ValueError(
            "A resume file is required."
        )

    RESUME_STORAGE_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    stored_filename = (
        f"{uuid4()}.pdf"
    )

    destination = (
        RESUME_STORAGE_DIR
        / stored_filename
    )

    relative_path = os.path.join(
        "storage",
        "resumes",
        stored_filename,
    )

    sha256 = hashlib.sha256()

    total_size = 0
    first_chunk = True

    try:

        with destination.open("wb") as output_file:

            while True:

                chunk = upload_file.file.read(
                    CHUNK_SIZE
                )

                if not chunk:
                    break

                # ------------------------------------------------
                # Size validation
                # ------------------------------------------------

                total_size += len(chunk)

                if total_size > MAX_RESUME_SIZE:
                    raise ValueError(
                        "Resume file exceeds the "
                        "maximum allowed size of 5 MB."
                    )

                # ------------------------------------------------
                # PDF magic-byte validation
                # ------------------------------------------------

                if first_chunk:

                    first_chunk = False

                    if not chunk.startswith(b"%PDF-"):
                        raise ValueError(
                            "The uploaded file is not "
                            "a valid PDF."
                        )

                # ------------------------------------------------
                # Persist bytes
                # ------------------------------------------------

                output_file.write(chunk)

                # ------------------------------------------------
                # Update SHA-256
                # ------------------------------------------------

                sha256.update(chunk)

        return {
            "stored_filename": stored_filename,
            "file_path": relative_path,
            "file_size": total_size,
            "file_hash": sha256.hexdigest(),
        }

    except Exception:

        if destination.exists():
            destination.unlink()

        raise


# ============================================================
# DELETE RESUME FILE
# ============================================================

def delete_resume_file(
    relative_path: str,
) -> None:
    """
    Delete a stored resume file.

    Used when the database transaction fails after the file
    has already been written.
    """

    file_path = (
        BASE_DIR
        / relative_path
    )

    if file_path.exists():
        file_path.unlink()