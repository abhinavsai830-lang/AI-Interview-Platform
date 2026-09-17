# backend/services/introduction_generator.py

import json
import os

from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL")

# ============================================================
# LLM
# ============================================================

llm = ChatGroq(
    model=GROQ_MODEL,
    api_key=GROQ_API_KEY,
    temperature=0.3,
)

# ============================================================
# INTERVIEW INTRODUCTION PROMPT
# ============================================================

INTRO_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are a friendly Senior Software Engineer conducting a technical interview.

Generate ONLY the interview introduction.

Rules:
- Welcome the candidate.
- Mention 1 or 2 projects naturally if available.
- Mention the interview duration.
- Say the interview will focus on projects and technical concepts.
- Do NOT ask any technical question.
- Keep it under 80 words.
- Return only plain text.
""",
        ),
        (
            "human",
            """
Interview Subject: {subject}

Duration: {duration} minutes

Candidate Profile:
{profile}
""",
        ),
    ]
)

# ============================================================
# GENERATE INTRODUCTION
# ============================================================

def generate_interview_intro(
    profile: dict,
    subject: str,
    duration: int,
) -> str:
    """
    Generates a natural interviewer greeting.

    Returns plain text.
    """

    chain = INTRO_PROMPT | llm

    response = chain.invoke(
        {
            "profile": json.dumps(profile, indent=2),
            "subject": subject,
            "duration": duration,
        }
    )

    return response.content.strip()