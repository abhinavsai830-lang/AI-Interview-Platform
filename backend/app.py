import tempfile
import traceback
import uuid
import re
import os
import base64
import requests
import json
import assemblyai as aai

from datetime import datetime, timedelta, timezone

from fastapi import Depends
from fastapi import FastAPI
from fastapi import UploadFile
from fastapi import File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.prebuilt import create_react_agent
from langchain_groq import ChatGroq

from .auth import get_current_user
from .schemas import InterviewRequest
from .database import Base, engine, get_db

from .models import (
    User,
    Interview,
    InterviewQuestion,
    InterviewAnswer,
    InterviewAnswerAnalysis,
)

from .routes.auth import router as auth_router


# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL")

MURF_API_KEY = os.getenv("MURF_API_KEY")

ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")

aai.settings.api_key = ASSEMBLYAI_API_KEY


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="AI Interviewer Platform",
    version="1.0.0"
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],

    # ========================================================
    # NEW:
    # Frontend is allowed to read the interview expiry header.
    # ========================================================
    expose_headers=[
        "X-Question-Number",
        "X-Interview-Complete",
        "X-Interview-Expires-At",
    ]
)


# ============================================================
# GLOBAL LANGGRAPH MODEL
# ============================================================

checkpointer = InMemorySaver()

model = ChatGroq(
    model=GROQ_MODEL,
    api_key=GROQ_API_KEY,
    temperature=0.4,
)

agent = create_react_agent(
    model=model.bind(tool_choice="none"),
    tools=[],
    checkpointer=checkpointer
)


# ============================================================
# INTERVIEW SESSION
# ============================================================

class InterviewSession:

    def __init__(self):

        self.interview_id = None

        self.question_count = 0
        self.current_subject = ""

        self.duration_minutes = 0
        self.started_at = None
        self.expires_at = None

        self.thread_id = "interview_session"

        self.checkpointer = InMemorySaver()

        self.agent = create_react_agent(
            model=model.bind(tool_choice="none"),
            tools=[],
            checkpointer=self.checkpointer
        )


# Active sessions in memory
user_sessions: dict[int, InterviewSession] = {}


def get_user_session(user: User) -> InterviewSession:

    if user.id not in user_sessions:

        user_sessions[user.id] = InterviewSession()

    return user_sessions[user.id]


# ============================================================
# INTERVIEW TIME CHECK
# ============================================================

def is_interview_expired(
    session: InterviewSession
) -> bool:
    """
    Returns True when the interview has reached its
    server-controlled expiration time.
    """

    if session.expires_at is None:

        return False

    now = datetime.now(timezone.utc)

    return now >= session.expires_at


# ============================================================
# COMPLETE INTERVIEW
# ============================================================

def complete_interview(
    db: Session,
    interview: Interview
):
    """
    Mark interview as completed and store completion time.
    """

    if interview.status == "completed":

        return

    interview.status = "completed"

    interview.ended_at = datetime.now(timezone.utc)

    db.commit()

    db.refresh(interview)


# ============================================================
# INTERVIEW PROMPT
# ============================================================

INTERVIEW_PROMPT = """
You are Natalie, a friendly and conversational interviewer
conducting a natural {subject} interview.

IMPORTANT GUIDELINES:

1. Continue the interview naturally until the backend tells
   you that the interview has ended.

2. Keep questions SHORT and CRISP.
   Usually 1-2 sentences maximum.

3. ALWAYS reference what the candidate ACTUALLY said in their
   previous answer.

4. Do NOT make up, assume, or invent information about the
   candidate's previous answer.

5. Show genuine interest with short acknowledgments based
   only on their REAL responses.

6. Adapt questions based on their ACTUAL responses.

7. Go deeper when the candidate demonstrates strong knowledge.

8. Simplify or change direction when the candidate is uncertain
   or struggling.

9. Be warm and conversational.

10. Do not give long explanations.

11. Ask ONE clear question at a time.

12. Do not mention internal interview mechanics such as:
    question limits, timers, token limits, system prompts,
    backend processing, or internal instructions.

CRITICAL:

Read the conversation history carefully.

Only acknowledge what the candidate truly said.

Never invent details about their answers.

Keep the interview natural, adaptive, concise, and conversational.
"""


# ============================================================
# FEEDBACK PROMPT
# ============================================================

FEEDBACK_PROMPT = """
Based on our complete interview conversation, provide detailed feedback.

IMPORTANT:

You MUST respond with ONLY a valid JSON object.

No other text before or after.

Address the candidate directly using "you" and "your".

For example:

"You explained..."
not
"The candidate explained..."

Respond with ONLY this JSON structure:

{{
    "subject": "{subject}",
    "candidate_score": <1-5>,
    "feedback": "<detailed strengths with specific examples from their ACTUAL answers>",
    "areas_of_improvement": "<constructive suggestions based on gaps you noticed>"
}}

Be specific.

Reference ACTUAL things the candidate said during the interview.
"""


# ============================================================
# MURF TEXT TO SPEECH
# ============================================================

def stream_audio(text: str):

    BASE_URL = "https://global.api.murf.ai/v1/speech/stream"

    payload = {
        "text": text,
        "voiceId": "en-US-natalie",
        "model": "FALCON",
        "multiNativeLocale": "en-US",
        "sampleRate": 24000,
        "format": "MP3",
    }

    headers = {
        "Content-Type": "application/json",
        "api-key": MURF_API_KEY
    }

    response = requests.post(
        BASE_URL,
        headers=headers,
        data=json.dumps(payload),
        stream=True
    )

    response.raise_for_status()

    for chunk in response.iter_content(
        chunk_size=4096
    ):

        if chunk:

            yield (
                base64.b64encode(chunk)
                .decode("utf-8")
                + "\n"
            )


# ============================================================
# START INTERVIEW
# ============================================================

@app.post("/start-interview")
def start_interview(

    data: InterviewRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    session = get_user_session(current_user)

    # --------------------------------------------------------
    # Create server-controlled interview timing
    # --------------------------------------------------------

    start_time = datetime.now(timezone.utc)

    end_time = start_time + timedelta(
        minutes=data.duration_minutes
    )

    # --------------------------------------------------------
    # Create database interview
    # --------------------------------------------------------

    interview = Interview(

        user_id=current_user.id,

        subject=data.subject,

        duration_minutes=data.duration_minutes,

        started_at=start_time,

        expires_at=end_time,

        status="active"

    )

    db.add(interview)

    db.commit()

    db.refresh(interview)

    # --------------------------------------------------------
    # Store active session information
    # --------------------------------------------------------

    session.interview_id = interview.id

    session.duration_minutes = data.duration_minutes

    session.started_at = start_time

    session.expires_at = end_time

    # --------------------------------------------------------
    # Create new LangGraph thread
    # --------------------------------------------------------

    session.thread_id = str(uuid.uuid4())

    session.current_subject = data.subject

    session.question_count = 1

    session.checkpointer = InMemorySaver()

    session.agent = create_react_agent(

        model=model.bind(
            tool_choice="none"
        ),

        tools=[],

        checkpointer=session.checkpointer

    )

    config = {
        "configurable": {
            "thread_id": session.thread_id
        }
    }

    # --------------------------------------------------------
    # Generate first question
    # --------------------------------------------------------

    formatted_prompt = INTERVIEW_PROMPT.format(
        subject=session.current_subject
    )

    response = session.agent.invoke(

        {
            "messages": [

                {
                    "role": "system",
                    "content": formatted_prompt
                },

                {
                    "role": "user",
                    "content": (
                        "Start the interview with a warm "
                        "greeting and ask the first question "
                        f"about {session.current_subject}. "
                        "Keep it SHORT."
                    )
                }

            ]
        },

        config=config

    )

    content = response["messages"][-1].content

    if isinstance(content, list):

        question = "".join(

            part["text"]

            for part in content

            if part.get("type") == "text"

        )

    else:

        question = content

    # --------------------------------------------------------
    # Save first question
    # --------------------------------------------------------

    question_record = InterviewQuestion(

        interview_id=interview.id,

        question_number=1,

        question_text=question,

        asked_at=datetime.now(timezone.utc)

    )

    db.add(question_record)

    db.commit()

    # ========================================================
    # NEW:
    # Send server expiry timestamp to frontend.
    #
    # IMPORTANT:
    # end_time exists HERE because it was created inside
    # start_interview().
    #
    # This header MUST NOT be used in submit_answer().
    # ========================================================

    return StreamingResponse(

        stream_audio(question),

        media_type="text/plain",

        headers={

            "X-Question-Number": "1",

            "X-Interview-Complete": "false",

            "X-Interview-Expires-At":
                end_time.isoformat(),

        }

    )


# ============================================================
# SPEECH TO TEXT
# ============================================================

def speech_to_text(
    audio_path: str
) -> str:

    try:

        transcriber = aai.Transcriber()

        transcript = transcriber.transcribe(
            audio_path
        )

        return (
            transcript.text
            if transcript.text
            else ""
        )

    except Exception:

        print("\nAssemblyAI Error")

        traceback.print_exc()

        return ""


# ============================================================
# RESPONSE QUALITY ANALYSIS
# ============================================================
# NEW PHASE 4.1:
# Analyze each candidate answer before generating the next
# interviewer question.
#
# This analysis is internal and stored in the database.
# The candidate does not see these scores yet.
# ============================================================

def analyze_candidate_answer(
    subject: str,
    question: str,
    answer: str,
) -> dict:

    analysis_prompt = f"""
You are an expert interview evaluator.

Analyze the candidate's answer to the interview question below.

INTERVIEW SUBJECT:
{subject}

QUESTION:
{question}

CANDIDATE ANSWER:
{answer}

Evaluate ONLY what the candidate actually said.

Do not assume knowledge that was not demonstrated.

Return ONLY valid JSON in exactly this structure:

{{
    "relevance_score": <integer from 1 to 5>,
    "correctness_score": <integer from 1 to 5>,
    "clarity_score": <integer from 1 to 5>,
    "depth_score": <integer from 1 to 5>,
    "strengths": "<brief description of demonstrated strengths>",
    "knowledge_gaps": "<brief description of missing or weak areas>",
    "difficulty_recommendation": "increase|maintain|decrease"
}}

SCORING:

relevance_score:
1 = does not answer the question
3 = partially answers the question
5 = directly answers the question

correctness_score:
1 = mostly incorrect
3 = partially correct
5 = technically correct based on the answer

clarity_score:
1 = very unclear
3 = understandable but imperfect
5 = clear and well structured

depth_score:
1 = superficial or extremely limited
3 = reasonable basic explanation
5 = detailed explanation with useful reasoning or examples

DIFFICULTY:

increase:
Use when the candidate demonstrates strong understanding.

maintain:
Use when the candidate demonstrates reasonable understanding.

decrease:
Use when the candidate appears uncertain, gives an incomplete answer,
or demonstrates a knowledge gap.

Be concise.

Return JSON only.
"""

    try:

        response = model.invoke(
            analysis_prompt
        )

        content = response.content

        if isinstance(content, list):

            content = "".join(
                part.get("text", "")
                for part in content
                if isinstance(part, dict)
            )

        content = (
            content
            .strip()
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        parsed = json.loads(content)

        def safe_score(value):

            try:

                return min(
                    5,
                    max(
                        1,
                        int(value)
                    )
                )

            except (
                TypeError,
                ValueError,
            ):

                return 3

        recommendation = parsed.get(
            "difficulty_recommendation",
            "maintain"
        )

        if recommendation not in {
            "increase",
            "maintain",
            "decrease",
        }:

            recommendation = "maintain"

        return {

            "relevance_score":
                safe_score(
                    parsed.get(
                        "relevance_score"
                    )
                ),

            "correctness_score":
                safe_score(
                    parsed.get(
                        "correctness_score"
                    )
                ),

            "clarity_score":
                safe_score(
                    parsed.get(
                        "clarity_score"
                    )
                ),

            "depth_score":
                safe_score(
                    parsed.get(
                        "depth_score"
                    )
                ),

            "strengths":
                str(
                    parsed.get(
                        "strengths",
                        ""
                    )
                ),

            "knowledge_gaps":
                str(
                    parsed.get(
                        "knowledge_gaps",
                        ""
                    )
                ),

            "difficulty_recommendation":
                recommendation,

        }

    except Exception:

        print(
            "\nResponse Analysis Error"
        )

        traceback.print_exc()

        return {

            "relevance_score": 3,
            "correctness_score": 3,
            "clarity_score": 3,
            "depth_score": 3,

            "strengths":
                "Unable to analyze this response.",

            "knowledge_gaps":
                "No analysis was available.",

            "difficulty_recommendation":
                "maintain",

        }


# ============================================================
# SUBMIT ANSWER
# ============================================================

@app.post("/submit-answer")
async def submit_answer(

    db: Session = Depends(get_db),

    audio: UploadFile = File(...),

    current_user: User = Depends(get_current_user)

):

    session = get_user_session(current_user)

    # --------------------------------------------------------
    # Make sure an interview exists
    # --------------------------------------------------------

    if session.interview_id is None:

        return StreamingResponse(

            stream_audio(
                "There is no active interview."
            ),

            media_type="text/plain",

            headers={

                "X-Question-Number": "0",

                "X-Interview-Complete":
                    "true"

            }

        )

    # --------------------------------------------------------
    # Get interview from database
    # --------------------------------------------------------

    interview = (

        db.query(Interview)

        .filter(

            Interview.id ==
                session.interview_id,

            Interview.user_id ==
                current_user.id

        )

        .first()

    )

    if not interview:

        return StreamingResponse(

            stream_audio(
                "I could not find the current interview."
            ),

            media_type="text/plain",

            headers={

                "X-Question-Number": "0",

                "X-Interview-Complete":
                    "true"

            }

        )

    # --------------------------------------------------------
    # Prevent answers after completion
    # --------------------------------------------------------

    if interview.status == "completed":

        return StreamingResponse(

            stream_audio(
                "This interview has already ended."
            ),

            media_type="text/plain",

            headers={

                "X-Question-Number":
                    str(session.question_count),

                "X-Interview-Complete":
                    "true"

            }

        )

    # --------------------------------------------------------
    # Find current question
    # --------------------------------------------------------

    current_question = (

        db.query(InterviewQuestion)

        .filter(

            InterviewQuestion.interview_id ==
                interview.id,

            InterviewQuestion.question_number ==
                session.question_count

        )

        .first()

    )

    if not current_question:

        return StreamingResponse(

            stream_audio(
                "I could not find the current "
                "interview question."
            ),

            media_type="text/plain",

            headers={

                "X-Question-Number":
                    str(session.question_count),

                "X-Interview-Complete":
                    "true"

            }

        )

    # --------------------------------------------------------
    # Save uploaded audio temporarily
    # --------------------------------------------------------

    temp_path = (

        tempfile.NamedTemporaryFile(

            delete=False,

            suffix=".webm"

        )

    ).name

    contents = await audio.read()

    with open(temp_path, "wb") as f:

        f.write(contents)

    # --------------------------------------------------------
    # Speech to text
    # --------------------------------------------------------

    try:

        answer = speech_to_text(
            temp_path
        )

    finally:

        if os.path.exists(temp_path):

            os.unlink(temp_path)

    # --------------------------------------------------------
    # Handle empty transcript
    # --------------------------------------------------------

    if not answer:

        answer = "Empty Text Received"

    # ========================================================
    # Save answer
    # ========================================================

    word_count = len(answer.split())

    answer_record = InterviewAnswer(

        question_id=current_question.id,

        transcript=answer,

        word_count=word_count,

        answered_at=datetime.now(timezone.utc)

    )

    db.add(answer_record)

    db.commit()


    # ========================================================
    # NEW PHASE 4.1:
    # Analyze and persist the quality of this answer.
    # ========================================================

    analysis_data = analyze_candidate_answer(

        subject=session.current_subject,

        question=current_question.question_text,

        answer=answer,

    )

    answer_analysis = InterviewAnswerAnalysis(

        answer_id=answer_record.id,

        relevance_score=
            analysis_data[
                "relevance_score"
            ],

        correctness_score=
            analysis_data[
                "correctness_score"
            ],

        clarity_score=
            analysis_data[
                "clarity_score"
            ],

        depth_score=
            analysis_data[
                "depth_score"
            ],

        strengths=
            analysis_data[
                "strengths"
            ],

        knowledge_gaps=
            analysis_data[
                "knowledge_gaps"
            ],

        difficulty_recommendation=
            analysis_data[
                "difficulty_recommendation"
            ],

    )

    db.add(
        answer_analysis
    )

    db.commit()





    # --------------------------------------------------------
    # Add answer to LangGraph
    # --------------------------------------------------------

    config = {

        "configurable": {

            "thread_id":
                session.thread_id

        }

    }

    session.agent.invoke(

        {

            "messages": [

                {

                    "role": "user",

                    "content": answer

                }

            ]

        },

        config=config

    )

    # ========================================================
    # IMPORTANT:
    #
    # We check expiration AFTER saving the answer.
    #
    # This is what allows a candidate to continue speaking
    # after 00:00 and finish naturally.
    # ========================================================

    if is_interview_expired(session):

        complete_interview(
            db,
            interview
        )

        closing_message = (

            "Your interview time has ended. "

            "Thank you for participating. "

            "I'll now prepare your feedback."

        )

        return StreamingResponse(

            stream_audio(
                closing_message
            ),

            media_type="text/plain",

            headers={

                "X-Question-Number":
                    str(
                        session.question_count
                    ),

                "X-Interview-Complete":
                    "true"

            }

        )

    # --------------------------------------------------------
    # Continue to next question
    # --------------------------------------------------------

    session.question_count += 1

    # ========================================================
    # NEW PHASE 4.1:
    # Use the private response analysis to guide the next
    # question's difficulty and direction.
    # ========================================================

    analysis_context = f"""
PRIVATE RESPONSE ANALYSIS:

Relevance:
{analysis_data["relevance_score"]}/5

Technical correctness:
{analysis_data["correctness_score"]}/5

Clarity:
{analysis_data["clarity_score"]}/5

Depth:
{analysis_data["depth_score"]}/5

Strengths:
{analysis_data["strengths"]}

Knowledge gaps:
{analysis_data["knowledge_gaps"]}

Difficulty recommendation:
{analysis_data["difficulty_recommendation"]}
"""


    prompt = f"""
The candidate just answered the previous interview question.

Look at their ACTUAL answer above.

Do NOT assume or make up what they said.

{analysis_context}

Now continue the interview naturally.

Rules:

1. Briefly acknowledge what they ACTUALLY said.
2. Ask one concise follow-up question.
3. Build the question from their REAL response.
4. Use the private response analysis to choose an
   appropriate difficulty.
5. Increase difficulty when the analysis recommends "increase".
6. Maintain difficulty when the analysis recommends "maintain".
7. Simplify or reinforce fundamentals when the analysis
   recommends "decrease".
8. Explore a knowledge gap when doing so is useful.
9. Do not expose scores or internal analysis to the candidate.
10. Do not mention question numbers.
11. Do not mention timers or interview duration.
12. Keep the TOTAL response concise, preferably under 3 sentences.

Be conversational and adaptive.
"""

    response = session.agent.invoke(

        {

            "messages": [

                {

                    "role": "user",

                    "content": prompt

                }

            ]

        },

        config=config

    )

    question = response["messages"][-1].content

    # ========================================================
    # Save next question
    # ========================================================

    next_question_record = InterviewQuestion(

        interview_id=interview.id,

        question_number=
            session.question_count,

        question_text=question,

        asked_at=datetime.now(timezone.utc)

    )

    db.add(next_question_record)

    db.commit()

    # --------------------------------------------------------
    # Return next question
    # --------------------------------------------------------

    return StreamingResponse(

        stream_audio(question),

        media_type="text/plain",

        headers={

            "X-Question-Number":
                str(
                    session.question_count
                ),

            "X-Interview-Complete":
                "false"

        }

    )


# ============================================================
# MANUAL END INTERVIEW
# ============================================================

@app.post("/end-interview")
def end_interview(

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    session = get_user_session(current_user)

    # --------------------------------------------------------
    # No active interview
    # --------------------------------------------------------

    if session.interview_id is None:

        return {

            "success": False,

            "message":
                "No active interview."

        }

    # --------------------------------------------------------
    # Find interview
    # --------------------------------------------------------

    interview = (

        db.query(Interview)

        .filter(

            Interview.id ==
                session.interview_id,

            Interview.user_id ==
                current_user.id

        )

        .first()

    )

    if not interview:

        return {

            "success": False,

            "message":
                "Interview not found."

        }

    # --------------------------------------------------------
    # Already completed
    # --------------------------------------------------------

    if interview.status == "completed":

        return {

            "success": True,

            "message":
                "Interview already completed.",

            "interview_id":
                interview.id,

            "status":
                interview.status,

            "ended_at":
                interview.ended_at

        }

    # --------------------------------------------------------
    # Complete interview
    # --------------------------------------------------------

    complete_interview(
        db,
        interview
    )

    return {

        "success": True,

        "message":
            "Interview ended successfully.",

        "interview_id":
            interview.id,

        "status":
            interview.status,

        "ended_at":
            interview.ended_at

    }


# ============================================================
# GET FEEDBACK
# ============================================================

@app.post("/get-feedback")
def get_feedback(

    current_user: User = Depends(get_current_user)

):

    session = get_user_session(current_user)

    config = {

        "configurable": {

            "thread_id":
                session.thread_id

        }

    }

    feedback_prompt = FEEDBACK_PROMPT.format(

        subject=
            session.current_subject

    )

    response = session.agent.invoke(

        {

            "messages": [

                {

                    "role": "user",

                    "content": (

                        f"{feedback_prompt}\n"

                        f"Review the entire interview on "

                        f"{session.current_subject} "

                        f"and provide specific, detailed "

                        f"feedback based on their ACTUAL answers."

                    )

                }

            ]

        },

        config=config

    )

    text = response["messages"][-1].content

    print(
        f"\n[Feedback Generated]\n{text}\n"
    )

    cleaned = text.strip()

    # --------------------------------------------------------
    # Remove <think> blocks
    # --------------------------------------------------------

    cleaned = re.sub(

        r"<think>.*?</think>",

        "",

        cleaned,

        flags=re.DOTALL

    ).strip()

    # --------------------------------------------------------
    # Remove markdown code fences
    # --------------------------------------------------------

    if "```" in cleaned:

        cleaned = (

            cleaned

            .split("```")[1]

            .replace("json", "")

            .strip()

        )

    # --------------------------------------------------------
    # Parse JSON
    # --------------------------------------------------------

    try:

        feedback = json.loads(cleaned)

        return {

            "success": True,

            "feedback": feedback

        }

    except json.JSONDecodeError:

        return {

            "success": False,

            "message":
                "Invalid feedback generated."

        }


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(

        "backend.app:app",

        host="0.0.0.0",

        port=8000,

        reload=True

    )
