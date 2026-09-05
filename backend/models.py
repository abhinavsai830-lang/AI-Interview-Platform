# backend/models.py

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


# ============================================================
# Helper
# ============================================================
# CHANGED:
# Centralized UTC timestamp generation so all models use the
# same datetime behavior.
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

    # ========================================================
    # FIX:
    # created_at now has an explicit Python-side default.
    # This ensures a value is generated when a new User is
    # created without manually supplying created_at.
    # ========================================================
    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    # Relationship:
    # One user can have multiple interviews.
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

    # Interview lifecycle:
    # active -> completed
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

    # Relationship with User
    user = relationship(
        "User",
        back_populates="interviews",
    )

    # Relationship with InterviewQuestion
    questions = relationship(
        "InterviewQuestion",
        back_populates="interview",
        cascade="all, delete-orphan",
        order_by="InterviewQuestion.question_number",
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

    # ========================================================
    # CHANGED:
    # Use the same UTC helper instead of datetime.utcnow.
    # ========================================================
    asked_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    # Relationship with Interview
    interview = relationship(
        "Interview",
        back_populates="questions",
    )

    # One question has one answer.
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

    # ========================================================
    # CHANGED:
    # Use the same UTC helper for answer timestamps.
    # ========================================================
    answered_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    # Relationship with InterviewQuestion
    question = relationship(
        "InterviewQuestion",
        back_populates="answer",
    )