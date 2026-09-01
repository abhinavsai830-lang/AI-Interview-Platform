from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# ---------- Authentication ----------

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


# ---------- Interview ----------

class InterviewRequest(BaseModel):
    subject: str
    duration_minutes: int = Field(
        ge=1,
        le=60,
        description="Interview duration in minutes"
    )