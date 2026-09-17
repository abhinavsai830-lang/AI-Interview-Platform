from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)

from sqlalchemy.orm import relationship

from .database import Base


def utc_now():
    return datetime.now(timezone.utc)


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

    resumes = relationship(
        "Resume",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class CandidateProfileRecord(Base):
    __tablename__ = "candidate_profiles"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    resume_id = Column(
        Integer,
        ForeignKey("resumes.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    profile_data = Column(
        JSON,
        nullable=False,
    )

    schema_version = Column(
        String,
        nullable=False,
        default="1.0",
    )

    model_name = Column(
        String,
        nullable=False,
    )

    generated_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    resume = relationship(
        "Resume",
        back_populates="candidate_profile",
    )


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

    feedback_record = relationship(
        "InterviewFeedback",
        back_populates="interview",
        uselist=False,
        cascade="all, delete-orphan",
    )

    evaluation = relationship(
        "InterviewEvaluation",
        back_populates="interview",
        uselist=False,
        cascade="all, delete-orphan",
    )


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

    analysis = relationship(
        "InterviewAnswerAnalysis",
        back_populates="answer",
        uselist=False,
        cascade="all, delete-orphan",
    )


class InterviewAnswerAnalysis(Base):
    __tablename__ = "interview_answer_analysis"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    answer_id = Column(
        Integer,
        ForeignKey("interview_answers.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    relevance_score = Column(
        Integer,
        nullable=False,
    )

    correctness_score = Column(
        Integer,
        nullable=False,
    )

    clarity_score = Column(
        Integer,
        nullable=False,
    )

    depth_score = Column(
        Integer,
        nullable=False,
    )

    strengths = Column(
        Text,
        nullable=False,
        default="",
    )

    knowledge_gaps = Column(
        Text,
        nullable=False,
        default="",
    )

    difficulty_recommendation = Column(
        String,
        nullable=False,
        default="maintain",
    )

    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    answer = relationship(
        "InterviewAnswer",
        back_populates="analysis",
    )


class InterviewEvaluation(Base):
    __tablename__ = "interview_evaluations"

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

    technical_knowledge_score = Column(
        Integer,
        nullable=False,
    )

    communication_score = Column(
        Integer,
        nullable=False,
    )

    problem_solving_score = Column(
        Integer,
        nullable=False,
    )

    depth_score = Column(
        Integer,
        nullable=False,
    )

    consistency_score = Column(
        Integer,
        nullable=False,
    )

    overall_score = Column(
        Integer,
        nullable=False,
    )

    summary = Column(
        Text,
        nullable=False,
        default="",
    )

    strengths = Column(
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
        back_populates="evaluation",
    )


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


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    original_filename = Column(
        String,
        nullable=False,
    )

    stored_filename = Column(
        String,
        nullable=False,
        unique=True,
    )

    file_path = Column(
        String,
        nullable=False,
    )

    content_type = Column(
        String,
        nullable=False,
    )

    file_size = Column(
        Integer,
        nullable=False,
    )

    file_hash = Column(
        String(64),
        nullable=False,
        index=True,
    )

    extracted_text = Column(
        Text,
        nullable=True,
    )

    uploaded_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="resumes",
    )

    candidate_profile = relationship(
        "CandidateProfileRecord",
        back_populates="resume",
        uselist=False,
        cascade="all, delete-orphan",
    )