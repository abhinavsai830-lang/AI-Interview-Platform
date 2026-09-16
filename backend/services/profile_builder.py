# backend/services/profile_builder.py

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
    temperature=0,
)

# ============================================================
# PROMPT
# IMPORTANT:
# Double braces are escaped for LangChain.
# ============================================================

PROFILE_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are an expert ATS resume parser.

Extract the candidate information and return ONLY valid JSON.

Required schema:

{{
  "name": "",
  "education": [],
  "skills": [],
  "projects": [
    {{
      "name": "",
      "description": "",
      "technologies": []
    }}
  ],
  "experience": [],
  "certifications": []
}}

Rules:
- Never invent information.
- Missing sections must be empty arrays.
- Return ONLY JSON.
- No markdown.
""",
        ),
        (
            "human",
            "{resume_text}",
        ),
    ]
)

# ============================================================
# PROFILE BUILDER
# ============================================================

def build_candidate_profile(resume_text: str) -> dict:

    chain = PROFILE_PROMPT | llm

    response = chain.invoke(
        {"resume_text": resume_text}
    )

    content = response.content.strip()

    print("\n========== RAW PROFILE ==========")
    print(content)
    print("================================\n")

    # Remove markdown if present
    if content.startswith("```"):
        content = (
            content.replace("```json", "")
            .replace("```", "")
            .strip()
        )

    try:
        return json.loads(content)

    except json.JSONDecodeError:

        start = content.find("{")
        end = content.rfind("}")

        if start != -1 and end != -1:
            return json.loads(content[start:end + 1])

        raise