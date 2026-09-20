from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from ..models import CandidateProfileRecord
from ..schemas import CandidateProfile


SCHEMA_VERSION = "1.0"


def persist_candidate_profile(
    db: Session,
    resume_id: int,
    profile: CandidateProfile,
    model_name: str,
) -> CandidateProfileRecord:
    """
    Create or update the candidate profile associated with a resume.

    Args:
        db: Active SQLAlchemy database session.
        resume_id: ID of the source resume.
        profile: Validated CandidateProfile instance.
        model_name: Name of the LLM used to generate the profile.

    Returns:
        CandidateProfileRecord: Persisted database record.

    Raises:
        ValueError: If resume_id or model_name is invalid.
    """

    if resume_id <= 0:
        raise ValueError("resume_id must be greater than zero.")

    if not model_name or not model_name.strip():
        raise ValueError("model_name cannot be empty.")

    profile_data = profile.model_dump()

    existing_record = (
        db.query(CandidateProfileRecord)
        .filter(
            CandidateProfileRecord.resume_id == resume_id
        )
        .first()
    )

    now = datetime.now(timezone.utc)

    if existing_record:
        existing_record.profile_data = profile_data
        existing_record.schema_version = SCHEMA_VERSION
        existing_record.model_name = model_name
        existing_record.updated_at = now

        db.commit()
        db.refresh(existing_record)

        return existing_record

    record = CandidateProfileRecord(
        resume_id=resume_id,
        profile_data=profile_data,
        schema_version=SCHEMA_VERSION,
        model_name=model_name,
        generated_at=now,
        updated_at=now,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


def get_candidate_profile(
    db: Session,
    resume_id: int,
) -> CandidateProfile | None:
    """
    Retrieve and validate the candidate profile for a resume.

    Args:
        db: Active SQLAlchemy database session.
        resume_id: ID of the source resume.

    Returns:
        CandidateProfile if a stored profile exists, otherwise None.

    Raises:
        ValueError: If resume_id is invalid.
        RuntimeError: If stored profile data no longer matches
                      the CandidateProfile schema.
    """

    if resume_id <= 0:
        raise ValueError("resume_id must be greater than zero.")

    record = (
        db.query(CandidateProfileRecord)
        .filter(
            CandidateProfileRecord.resume_id == resume_id
        )
        .first()
    )

    if record is None:
        return None

    try:
        return CandidateProfile.model_validate(
            record.profile_data
        )
    except Exception as exc:
        raise RuntimeError(
            "Stored candidate profile does not match "
            "the current CandidateProfile schema."
        ) from exc