from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


# -------------------------
# User Table
# -------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)

    interviews = relationship("Interview", back_populates="user")


# -------------------------
# Interview Table
# -------------------------
class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    subject = Column(String, nullable=False)

    duration_minutes = Column(Integer, nullable=False)

    status = Column(String, default="active")

    started_at = Column(DateTime, default=datetime.utcnow)

    expires_at = Column(DateTime)

    ended_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="interviews")

    questions = relationship(
        "InterviewQuestion",
        back_populates="interview",
        cascade="all, delete-orphan",
    )


# -------------------------
# Question Table
# -------------------------
class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True)

    interview_id = Column(
        Integer,
        ForeignKey("interviews.id"),
        nullable=False,
    )

    question_number = Column(Integer, nullable=False)

    question_text = Column(Text, nullable=False)

    asked_at = Column(DateTime, default=datetime.utcnow)

    interview = relationship("Interview", back_populates="questions")

    answer = relationship(
        "InterviewAnswer",
        back_populates="question",
        uselist=False,
        cascade="all, delete-orphan",
    )


# -------------------------
# Answer Table
# -------------------------
class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True)

    question_id = Column(
        Integer,
        ForeignKey("interview_questions.id"),
        nullable=False,
    )

    transcript = Column(Text, nullable=False)

    word_count = Column(Integer, default=0)

    answered_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("InterviewQuestion", back_populates="answer")