# backend/routes/auth.py

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)

from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

from ..database import get_db

from ..models import (
    Interview,
    InterviewFeedback,
    User,
)

from ..schemas import (
    Token,
    UserCreate,
    UserLogin,
    UserRead,
)

# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

# ============================================================
# DASHBOARD FEEDBACK PAYLOAD
# ============================================================

class DashboardFeedbackPayload(BaseModel):
    candidate_score: int = Field(ge=1, le=5)
    feedback: str = ""
    areas_of_improvement: str = ""

# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(User)
        .filter(User.email == payload.email.lower())
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return Token(
        access_token=create_access_token(str(user.id)),
        user=user,
    )

# ============================================================
# LOGIN (Frontend JSON)
# ============================================================

@router.post(
    "/login",
    response_model=Token,
)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == payload.email.lower())
        .first()
    )

    if (
        not user
        or not verify_password(
            payload.password,
            user.hashed_password,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    return Token(
        access_token=create_access_token(str(user.id)),
        user=user,
    )

# ============================================================
# SWAGGER OAUTH LOGIN
# ============================================================
#
# This endpoint is used ONLY by Swagger's Authorize button.
# Your frontend will continue using POST /auth/login.
# ============================================================

@router.post(
    "/token",
    response_model=Token,
    include_in_schema=False,
)
def swagger_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == form_data.username.lower())
        .first()
    )

    if (
        not user
        or not verify_password(
            form_data.password,
            user.hashed_password,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return Token(
        access_token=create_access_token(str(user.id)),
        user=user,
    )

# ============================================================
# CURRENT USER
# ============================================================

@router.get(
    "/me",
    response_model=UserRead,
)
def me(
    current_user: User = Depends(get_current_user),
):
    return current_user

# ============================================================
# SAVE INTERVIEW FEEDBACK
# ============================================================

@router.post("/dashboard/save-feedback")
def save_dashboard_feedback(
    payload: DashboardFeedbackPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = (
        db.query(Interview)
        .filter(
            Interview.user_id == current_user.id,
            Interview.status == "completed",
        )
        .order_by(
            Interview.ended_at.desc(),
            Interview.id.desc(),
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=404,
            detail="No completed interview found.",
        )

    feedback_record = (
        db.query(InterviewFeedback)
        .filter(
            InterviewFeedback.interview_id == interview.id
        )
        .first()
    )

    if feedback_record:
        feedback_record.candidate_score = payload.candidate_score
        feedback_record.feedback = payload.feedback
        feedback_record.areas_of_improvement = (
            payload.areas_of_improvement
        )
    else:
        feedback_record = InterviewFeedback(
            interview_id=interview.id,
            candidate_score=payload.candidate_score,
            feedback=payload.feedback,
            areas_of_improvement=payload.areas_of_improvement,
        )
        db.add(feedback_record)

    db.commit()
    db.refresh(feedback_record)

    return {
        "success": True,
        "interview_id": interview.id,
        "candidate_score": feedback_record.candidate_score,
    }

# ============================================================
# DASHBOARD STATS
# ============================================================

@router.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    completed_interviews = (
        db.query(Interview)
        .filter(
            Interview.user_id == current_user.id,
            Interview.status == "completed",
        )
        .order_by(
            Interview.ended_at.desc(),
            Interview.id.desc(),
        )
        .all()
    )

    interview_count = len(completed_interviews)

    total_practice_seconds = 0

    for interview in completed_interviews:
        if (
            not interview.started_at
            or not interview.ended_at
        ):
            continue

        started_at = interview.started_at
        ended_at = interview.ended_at

        if started_at.tzinfo:
            started_at = started_at.replace(tzinfo=None)

        if ended_at.tzinfo:
            ended_at = ended_at.replace(tzinfo=None)

        duration_seconds = (
            ended_at - started_at
        ).total_seconds()

        if duration_seconds > 0:
            total_practice_seconds += int(duration_seconds)

    latest_feedback = (
        db.query(InterviewFeedback)
        .join(
            Interview,
            Interview.id == InterviewFeedback.interview_id,
        )
        .filter(
            Interview.user_id == current_user.id,
            Interview.status == "completed",
        )
        .order_by(
            Interview.ended_at.desc(),
            Interview.id.desc(),
        )
        .first()
    )

    latest_score = None

    if latest_feedback:
        latest_score = latest_feedback.candidate_score

    return {
        "success": True,
        "interview_count": interview_count,
        "latest_score": latest_score,
        "practice_time_seconds": total_practice_seconds,
    }