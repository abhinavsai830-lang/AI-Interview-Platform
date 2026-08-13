import tempfile
import traceback 
import uuid
from fastapi import Depends
from fastapi import FastAPI
from fastapi import UploadFile
from fastapi import File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langgraph.checkpoint.memory import InMemorySaver
from langchain.agents import create_agent
import os
from langchain_groq import ChatGroq
import base64
import requests
import json
import assemblyai as aai

from .auth import get_current_user
from .database import Base, engine
from .models import User
from .routes.auth import router as auth_router

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MURF_API_KEY = os.getenv("MURF_API_KEY")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
#print("AssemblyAI Key:", ASSEMBLYAI_API_KEY)
aai.settings.api_key = ASSEMBLYAI_API_KEY


app=FastAPI(
    title="AI Interviewer Platform",
    version='1.0.0'
)
Base.metadata.create_all(bind=engine)
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Question-Number", "X-Interview-Complete"]
)

checkpointer = InMemorySaver()

model = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=GROQ_API_KEY,
    temperature=0.4,
)

agent = create_agent(
    model=model,
    tools=[],
    checkpointer=checkpointer
)


class InterviewSession():
    def __init__(self):
        self.question_count = 0
        self.current_subject = ""
        self.thread_id = "interview_session"
        self.checkpointer = InMemorySaver()
        self.agent = create_agent(
            model=model,
            tools=[],
            checkpointer=self.checkpointer
        )


user_sessions: dict[int, InterviewSession] = {}


def get_user_session(user: User) -> InterviewSession:
    if user.id not in user_sessions:
        user_sessions[user.id] = InterviewSession()
    return user_sessions[user.id]
class InterviewRequest(BaseModel):
    subject: str


INTERVIEW_PROMPT = """You are Natalie, a friendly and conversational interviewer conducting a natural {subject} interview.

IMPORTANT GUIDELINES:
1. Ask exactly 5 questions total throughout the interview
2. Keep questions SHORT and CRISP (1-2 sentences maximum)
3. ALWAYS reference what the candidate ACTUALLY said in their previous answer - do NOT make up or assume their answers
4. Show genuine interest with brief acknowledgments based on their REAL responses
5. Adapt questions based on their ACTUAL responses - go deeper if they're strong, adjust if uncertain
6. Be warm and conversational but CONCISE
7. No lengthy explanations - just ask clear, direct questions

CRITICAL: Read the conversation history carefully. Only acknowledge what the candidate truly said, not what you think they might have said.

Keep it short, conversational, and adaptive!
"""


FEEDBACK_PROMPT = """Based on our complete interview conversation, provide detailed feedback.
    IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text before or after.
    Address the candidate directly using "you" and "your" (e.g., "You explained..." not "The candidate explained...").
    Respond with ONLY this JSON structure (no markdown, no code blocks, no extra text):
    {{
        "subject": "{subject}",
        "candidate_score": <1-5>,
        "feedback": "<detailed strengths with specific examples from their ACTUAL answers>",
        "areas_of_improvement": "<constructive suggestions based on gaps you noticed>"
    }}
    Be specific - reference ACTUAL things they said during the interview.
    """



def stream_audio(text:str):
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
   # print(response.text)
    for chunk in response.iter_content(chunk_size=4096):
        #print(chunk)
        if chunk:
            yield base64.b64encode(chunk).decode("utf-8") + "\n"



@app.post("/start-interview")
def start_interview(data: InterviewRequest, current_user: User = Depends(get_current_user)):
    session = get_user_session(current_user)
    session.thread_id = str(uuid.uuid4())#every time press start interview new thread will be created
    session.current_subject = data.subject
    session.question_count = 1
    session.checkpointer = InMemorySaver()
    session.agent = create_agent(
        model=model,
        tools=[],
        checkpointer=session.checkpointer
    )
    config = {"configurable": {"thread_id": session.thread_id}}
    formatted_prompt = INTERVIEW_PROMPT.format(subject=session.current_subject)
    response = session.agent.invoke({
        "messages": [
            {"role": "system", "content": formatted_prompt},
            {"role": "user", "content": f"Start the interview with a warm greeting and ask the first question about {session.current_subject}. Keep it SHORT (1-2 sentences)."}
        ]
    }, config=config)
    content = response["messages"][-1].content
    if isinstance(content, list):
        question = "".join(
            part["text"] for part in content
            if part.get("type") == "text"
        )
    else:
        question = content
    #print(question)
    return StreamingResponse(
        stream_audio(question),
        media_type="text/plain",
        headers={
            "X-Question-Number": "1",
            "X-Interview-Complete": "false"
        }
        ) 


def speech_to_text(audio_path:str)->str:
    try:
        transcript = aai.Transcriber()
        transcript=transcript.transcribe(audio_path)
        return transcript.text if transcript.text else ""
    except Exception as r:
        print("\nAssemblyAI Error")
        traceback.print_exc()
        return ""


@app.post("/submit-answer")
async def submit_answer(audio:UploadFile=File(...), current_user: User = Depends(get_current_user)):
    session = get_user_session(current_user)
    temp_path=(tempfile.NamedTemporaryFile(
        delete=False, 
        suffix=".webm"
        )).name
    contents=await audio.read()
    with open(temp_path, "wb") as f:
        f.write(contents)
    try:
        answer=speech_to_text(temp_path)
    finally:
        os.unlink(temp_path)


   
    if not answer:
        answer = "Empty Text Recived"
    config = {"configurable": {"thread_id": session.thread_id}}
    session.agent.invoke({"messages":[{"role":"user","content":answer}]},config=config)
    session.question_count += 1
    if session.question_count > 5:
        closing_message=(
            "That concludes our interview. "
            "Thank you for your time and thoughtful responses. "
            "I'll review your answers and provide feedback"
        )
        return StreamingResponse(
            stream_audio(closing_message),
            media_type="text/plain",
            headers={
                'X-Question-Number': str(session.question_count - 1),
                'X-Interview-Complete': 'true'
            }
        )
    prompt=f"""  The candidate just answered question {session.question_count - 1}.
    
            Look at their ACTUAL answer above. Do NOT assume or make up what they said.
            
            Now ask question {session.question_count} of 5:
            1. Briefly acknowledge what they ACTUALLY said (1 sentence) - quote their exact words if needed
            2. Ask your next question that builds on their REAL response (1-2 sentences)
            3. If they said "I don't know" or gave a wrong answer, acknowledge that and ask something simpler
            4. Keep the TOTAL response under 3 sentences
            Be conversational but CONCISE. Only reference what they truly said."""
    response = session.agent.invoke(
        {
            "messages":[{"role":"user","content":prompt}]
            },config=config)
    question = response["messages"][-1].content
    #print(f"Question {session.question_count}: {question}")
    return StreamingResponse(
        stream_audio(question),
        media_type="text/plain",
        headers={
            "X-Question-Number":str(session.question_count),
            "X-Interview-Complete":"false"
        }
    )
@app.post("/get-feedback")
def get_feedback(current_user: User = Depends(get_current_user)):
    session = get_user_session(current_user)
    config = {"configurable": {"thread_id": session.thread_id}}
    feedback_prompt = FEEDBACK_PROMPT.format(
    subject=session.current_subject
    )
    response= session.agent.invoke(
        {
            "messages":[
                {"role":"user",
                 "content":f"{feedback_prompt}\n Review  the entire interview on {session.current_subject}   and provide specific , detailed feedback based on their ACTUAL answers."}]
        },config=config)  
    text = response["messages"][-1].content
    print(f"\n[Feedback Generated]\n{text}\n")
    cleaned = text.strip()
    if "```" in cleaned:
        cleaned = cleaned.split("```")[1].replace("json", "").strip()

    try:
        feedback = json.loads(cleaned)
        return {
            "success": True,
            "feedback": feedback
        }
    except json.JSONDecodeError:
        return {
            "success": False,
            "message": "Invalid feedback generated."
        }

    #print(f"\n[Feedback Generated]n{text}\n")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )