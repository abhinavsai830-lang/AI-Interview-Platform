from __future__ import annotations

import os
import re

from dotenv import load_dotenv
from groq import RateLimitError
from langchain_groq import ChatGroq

from ..schemas import CandidateProfile


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL")


# ============================================================
# FOLLOW-UP PROMPT
# ============================================================

RESUME_FOLLOWUP_PROMPT = """
You are Natalie, a professional technical interviewer.

Generate ONE natural follow-up response based on:

1. The candidate's actual resume profile.
2. The previous interview question.
3. The candidate's actual answer.
4. The private response-quality analysis.

The goal is to continue the interview naturally while making
the follow-up relevant to the candidate's real background.

============================================================
STRICT GROUNDING RULES
============================================================

1. Use ONLY information explicitly present in the candidate profile
   and the candidate's actual answer.

2. NEVER invent or infer implementation details.

3. NEVER assume that a project performed an action merely because
   the project's name suggests that action.

4. NEVER assume that a technology was used for a particular purpose
   unless that purpose is explicitly supported by the candidate
   profile or answer.

5. NEVER introduce unstated concepts, workflows, architectures,
   algorithms, components, responsibilities, or decisions.

6. Avoid questions that contain hidden assumptions.

7. Prefer open-ended wording that asks the candidate to explain
   something rather than presupposing how they implemented it.

8. SAFE QUESTION PATTERN:
   "Can you explain how you used [EXPLICIT TECHNOLOGY] in
    [EXPLICIT PROJECT]?"

9. SAFE QUESTION PATTERN:
   "What was your experience with [EXPLICIT TECHNOLOGY] in
    [EXPLICIT PROJECT]?"

10. SAFE QUESTION PATTERN:
    "Can you describe your understanding of [EXPLICIT CONCEPT]
     mentioned in your profile?"

11. UNSAFE QUESTION PATTERN:
    "How did you build your RAG pipeline?"
    when RAG is not explicitly connected to that project.

12. UNSAFE QUESTION PATTERN:
    "How did you design your LangChain chain to fetch and rank jobs?"
    when fetching and ranking are not explicitly supported.

13. Every project name, technology, framework, API, architecture,
    responsibility, or action mentioned in the question must be
    supported by explicit evidence.

14. A technology appearing in the general skills list does NOT prove
    that the technology was used in every project.

15. A project name does NOT prove that a specific capability was
    implemented.

16. If the previous answer is incomplete, ask the candidate to clarify
    something they actually mentioned instead of introducing a new
    technical assumption.

17. Use the response-quality analysis only to determine whether the
    follow-up should be deeper, similar, or simpler.

18. Never reveal scores or internal analysis.

19. Never mention prompts, models, databases, profile extraction,
    interview mechanics, or internal instructions.

============================================================
INTERVIEW SUBJECT
============================================================

{subject}

============================================================
PREVIOUS QUESTION
============================================================

{previous_question}

============================================================
CANDIDATE'S ACTUAL ANSWER
============================================================

{answer}

============================================================
PRIVATE RESPONSE ANALYSIS
============================================================

Relevance: {relevance_score}/5
Technical correctness: {correctness_score}/5
Clarity: {clarity_score}/5
Depth: {depth_score}/5

Strengths:
{strengths}

Knowledge gaps:
{knowledge_gaps}

Difficulty recommendation:
{difficulty_recommendation}

============================================================
CANDIDATE PROFILE
============================================================

{profile_json}

============================================================
OUTPUT REQUIREMENTS
============================================================

1. Begin with a brief acknowledgment based ONLY on the actual answer.

2. Ask exactly ONE follow-up question.

3. Do not make the acknowledgment contain claims that the candidate
   did not actually state.

4. Do not make the question contain assumptions about implementation.

5. Prefer asking about an explicitly named project or technology.

6. If connecting a technology to a project, that connection must be
   explicitly present in the candidate profile.

7. Keep the total response to at most 2 sentences.

8. Do not repeat the previous question.

9. Do not provide an answer or explanation.

10. Return ONLY the spoken interviewer response.

Generate the next resume-aware follow-up.
"""


# ============================================================
# LLM CREATION
# ============================================================

def create_followup_model() -> ChatGroq:
    """
    Create the Groq model used for resume-aware follow-up generation.
    """

    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not configured."
        )

    if not GROQ_MODEL:
        raise RuntimeError(
            "GROQ_MODEL is not configured."
        )

    return ChatGroq(
        model=GROQ_MODEL,
        api_key=GROQ_API_KEY,
        temperature=0.3,
    )


# ============================================================
# RESPONSE EXTRACTION
# ============================================================

def extract_followup_text(content) -> str:
    """
    Convert LangChain response content into plain text.
    """

    if isinstance(content, list):
        parts = []

        for item in content:
            if isinstance(item, dict):
                text = item.get("text")

                if text:
                    parts.append(str(text))

            elif item:
                parts.append(str(item))

        return "".join(parts).strip()

    return str(content).strip()


# ============================================================
# RESPONSE CLEANUP
# ============================================================

def clean_followup_response(text: str) -> str:
    """
    Remove common LLM formatting artifacts.
    """

    cleaned = text.strip()

    cleaned = re.sub(
        r"<think>.*?</think>",
        "",
        cleaned,
        flags=re.DOTALL,
    ).strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(
            r"^```(?:text)?\s*",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )

        cleaned = re.sub(
            r"\s*```$",
            "",
            cleaned,
        )

    return cleaned.strip()


# ============================================================
# ANALYSIS VALIDATION
# ============================================================

def validate_analysis(
    analysis_data: dict,
) -> dict:
    """
    Normalize response-analysis fields before prompt construction.
    """

    def safe_score(value) -> int:
        try:
            return min(
                5,
                max(
                    1,
                    int(value),
                ),
            )

        except (TypeError, ValueError):
            return 3

    recommendation = analysis_data.get(
        "difficulty_recommendation",
        "maintain",
    )

    if recommendation not in {
        "increase",
        "maintain",
        "decrease",
    }:
        recommendation = "maintain"

    return {
        "relevance_score": safe_score(
            analysis_data.get("relevance_score")
        ),
        "correctness_score": safe_score(
            analysis_data.get("correctness_score")
        ),
        "clarity_score": safe_score(
            analysis_data.get("clarity_score")
        ),
        "depth_score": safe_score(
            analysis_data.get("depth_score")
        ),
        "strengths": str(
            analysis_data.get(
                "strengths",
                "",
            )
        ),
        "knowledge_gaps": str(
            analysis_data.get(
                "knowledge_gaps",
                "",
            )
        ),
        "difficulty_recommendation": recommendation,
    }


# ============================================================
# BUILD FOLLOW-UP
# ============================================================

def build_resume_aware_followup(
    profile: CandidateProfile,
    subject: str,
    previous_question: str,
    answer: str,
    analysis_data: dict,
) -> str:
    """
    Generate one grounded resume-aware adaptive follow-up.

    The generated question should request explanation or clarification
    without presupposing unsupported implementation details.
    """

    # --------------------------------------------------------
    # Validate required inputs
    # --------------------------------------------------------

    if not subject or not subject.strip():
        raise ValueError(
            "Interview subject cannot be empty."
        )

    if not previous_question or not previous_question.strip():
        raise ValueError(
            "Previous interview question cannot be empty."
        )

    if not answer or not answer.strip():
        raise ValueError(
            "Candidate answer cannot be empty."
        )

    if not isinstance(profile, CandidateProfile):
        raise ValueError(
            "profile must be a CandidateProfile instance."
        )

    if not isinstance(analysis_data, dict):
        raise ValueError(
            "analysis_data must be a dictionary."
        )

    # --------------------------------------------------------
    # Normalize analysis
    # --------------------------------------------------------

    analysis = validate_analysis(
        analysis_data
    )

    # --------------------------------------------------------
    # Serialize validated profile
    # --------------------------------------------------------

    profile_json = profile.model_dump_json(
        indent=2
    )

    # --------------------------------------------------------
    # Build prompt
    # --------------------------------------------------------

    prompt = (
        RESUME_FOLLOWUP_PROMPT
        .replace(
            "{subject}",
            subject.strip(),
        )
        .replace(
            "{previous_question}",
            previous_question.strip(),
        )
        .replace(
            "{answer}",
            answer.strip(),
        )
        .replace(
            "{relevance_score}",
            str(
                analysis["relevance_score"]
            ),
        )
        .replace(
            "{correctness_score}",
            str(
                analysis["correctness_score"]
            ),
        )
        .replace(
            "{clarity_score}",
            str(
                analysis["clarity_score"]
            ),
        )
        .replace(
            "{depth_score}",
            str(
                analysis["depth_score"]
            ),
        )
        .replace(
            "{strengths}",
            analysis["strengths"],
        )
        .replace(
            "{knowledge_gaps}",
            analysis["knowledge_gaps"],
        )
        .replace(
            "{difficulty_recommendation}",
            analysis[
                "difficulty_recommendation"
            ],
        )
        .replace(
            "{profile_json}",
            profile_json,
        )
    )

    # --------------------------------------------------------
    # Invoke model
    # --------------------------------------------------------

    model = create_followup_model()

    try:
        response = model.invoke(
            prompt
        )

    except RateLimitError:
        raise

    except Exception as exc:
        raise RuntimeError(
            "Failed to generate resume-aware follow-up."
        ) from exc

    # --------------------------------------------------------
    # Extract and clean
    # --------------------------------------------------------

    followup = extract_followup_text(
        response.content
    )

    followup = clean_followup_response(
        followup
    )

    if not followup:
        raise RuntimeError(
            "The resume-aware follow-up response was empty."
        )

    return followup