from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


# ============================================================
# AUTHENTICATION
# ============================================================

class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


# ============================================================
# INTERVIEW
# ============================================================

class InterviewRequest(BaseModel):
    subject: str

    duration_minutes: int = Field(
        ge=1,
        le=60,
        description="Interview duration in minutes",
    )

    stage: Literal[
        "welcome",
        "begin",
    ] = Field(
        default="welcome",
        description=(
            "Interview lifecycle stage. "
            "'welcome' prepares the interview and generates "
            "the personalized introduction. "
            "'begin' starts the timed interview and generates "
            "the first question."
        ),
    )


# ============================================================
# CANDIDATE PROFILE
# ============================================================

class EducationItem(BaseModel):
    degree: str = ""
    field_of_study: str = ""
    institution: str = ""
    start_date: str = ""
    end_date: str = ""

    class Config:
        extra = "forbid"


class ProjectItem(BaseModel):
    name: str = ""
    description: str = ""
    technologies: list[str] = Field(
        default_factory=list
    )

    class Config:
        extra = "forbid"


class ExperienceItem(BaseModel):
    job_title: str = ""
    company: str = ""
    description: str = ""
    technologies: list[str] = Field(
        default_factory=list
    )
    start_date: str = ""
    end_date: str = ""

    class Config:
        extra = "forbid"


class CertificationItem(BaseModel):
    name: str = ""
    issuer: str = ""
    date: str = ""

    class Config:
        extra = "forbid"


class CandidateProfile(BaseModel):
    name: str = ""

    education: list[EducationItem] = Field(
        default_factory=list
    )

    skills: list[str] = Field(
        default_factory=list
    )

    projects: list[ProjectItem] = Field(
        default_factory=list
    )

    experience: list[ExperienceItem] = Field(
        default_factory=list
    )

    certifications: list[CertificationItem] = Field(
        default_factory=list
    )

    class Config:
        extra = "forbid"