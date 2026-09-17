# backend/services/question_generator.py

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
    temperature=0.4,
)

# ============================================================
# PROMPT
# ============================================================

QUESTION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are a Senior Software Engineer conducting a technical interview.

Your personality:
- Professional
- Friendly
- Curious
- Concise

Interview rules:

1. Ask EXACTLY ONE question.
2. Maximum 25 words.
3. Never ask multiple questions.
4. Never explain the candidate's project.
5. Prefer implementation and design decisions.
6. Speak naturally like a human interviewer.
7. Do not use bullet points.
8. Return only the question.

Question priority:

1. Candidate projects
2. Technologies used
3. Backend architecture
4. Databases
5. General technical concepts

Good examples:

"I noticed your AI Interview Platform. Why did you choose LangGraph?"

"Let's discuss your Job Search Agent. How did tool calling improve retrieval?"

Bad examples:

"Explain the architecture, database, API design and scalability..."

"What is OOP?"
""",
        ),
        (
            "human",
            "Candidate Profile:\n{profile}",
        ),
    ]
)
def generate_personalized_question(profile: dict) -> str:
    """
    Generates one personalized interview question
    from the structured candidate profile.
    """

    chain = QUESTION_PROMPT | llm

    response = chain.invoke(
        {
            "profile": json.dumps(profile, indent=2)
        }
    )

    return response.content.strip()