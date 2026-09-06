# backend/models.py

from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)

from sqlalchemy.orm import relationship

from .database import Base


# ============================================================
# Helper
# ============================================================

def utc_now():
    return datetime.now(timezone.utc)


# ============================================================
# User Model
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    email = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    hashed_password = Column(
        String,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    interviews = relationship(
        "Interview",
        back_populates="user",
        cascade="all, delete-orphan",
    )


# ============================================================
# Interview Model
# ============================================================

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    subject = Column(
        String,
        nullable=False,
    )

    duration_minutes = Column(
        Integer,
        nullable=False,
    )

    status = Column(
        String,
        default="active",
        nullable=False,
    )

    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    ended_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    user = relationship(
        "User",
        back_populates="interviews",
    )

    questions = relationship(
        "InterviewQuestion",
        back_populates="interview",
        cascade="all, delete-orphan",
        order_by="InterviewQuestion.question_number",
    )

    # ========================================================
    # NEW:
    # One interview has one feedback record.
    # ========================================================

    feedback_record = relationship(
        "InterviewFeedback",
        back_populates="interview",
        uselist=False,
        cascade="all, delete-orphan",
    )


# ============================================================
# Interview Question Model
# ============================================================

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    interview_id = Column(
        Integer,
        ForeignKey("interviews.id"),
        nullable=False,
    )

    question_number = Column(
        Integer,
        nullable=False,
    )

    question_text = Column(
        Text,
        nullable=False,
    )

    asked_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    interview = relationship(
        "Interview",
        back_populates="questions",
    )

    answer = relationship(
        "InterviewAnswer",
        back_populates="question",
        uselist=False,
        cascade="all, delete-orphan",
    )


# ============================================================
# Interview Answer Model
# ============================================================

class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    question_id = Column(
        Integer,
        ForeignKey("interview_questions.id"),
        nullable=False,
        unique=True,
    )

    transcript = Column(
        Text,
        nullable=False,
    )

    word_count = Column(
        Integer,
        default=0,
        nullable=False,
    )

    answered_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    question = relationship(
        "InterviewQuestion",
        back_populates="answer",
    )


# ============================================================
# Interview Feedback Model
# ============================================================
# NEW:
# Stores the AI-generated score and feedback permanently.
#
# This is deliberately a separate table so we do NOT need to
# alter the existing interviews table in the current MVP DB.
# ============================================================

class InterviewFeedback(Base):
    __tablename__ = "interview_feedback"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    interview_id = Column(
        Integer,
        ForeignKey("interviews.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    candidate_score = Column(
        Integer,
        nullable=False,
    )

    feedback = Column(
        Text,
        nullable=False,
        default="",
    )

    areas_of_improvement = Column(
        Text,
        nullable=False,
        default="",
    )

    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    interview = relationship(
        "Interview",
        back_populates="feedback_record",
    )