from urllib import response
import tempfile
from flask import Flask,request,jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import InMemorySaver
from langchain.agents import create_agent
import os
from langchain_groq import ChatGroq
import base64
import requests
import json
import assemblyai as aai

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MURF_API_KEY = os.getenv("MURF_API_KEY")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
print("AssemblyAI Key:", ASSEMBLYAI_API_KEY)
aai.settings.api_key = ASSEMBLYAI_API_KEY

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

question_count = 0
current_subject = ""
thread_id = "interview_session"

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

Keep it short, conversational, and adaptive!"""



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
    Be specific - reference ACTUAL things they said during the interview."""
app = Flask(__name__)
CORS(app,expose_headers=["X-Question-Number"])


def stream_audio(text):
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
    print(response.status_code)
   # print(response.text)
    for chunk in response.iter_content(chunk_size=4096):
        #print(chunk)
        if chunk:
            yield base64.b64encode(chunk).decode("utf-8") + "\n"



@app.route("/start-interview", methods=["POST"])
def start_interview():
    global question_count, current_subject, checkpointer, agent
    data = request.json
    current_subject = data.get("subject", "Python")
    question_count = 1
    checkpointer = InMemorySaver()
    agent = create_agent(
        model=model,
        tools=[],
        checkpointer=checkpointer
    )
    config = {"configurable": {"thread_id": thread_id}}
    formatted_prompt = INTERVIEW_PROMPT.format(subject=current_subject)
    response = agent.invoke({
        "messages": [
            {"role": "system", "content": formatted_prompt},
            {"role": "user", "content": f"Start the interview with a warm greeting and ask the first question about {current_subject}. Keep it SHORT (1-2 sentences)."}
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
    return stream_audio(question), {"Content-Type": "text/plain"}
def speech_to_text(audio_path):
    transcript = aai.Transcriber()
    transcript=transcript.transcribe(audio_path)
    return transcript.text if transcript.text else ""



@app.route("/submit-answer", methods=["POST"])
def submit_answer():
    global question_count

    audio_file = request.files['audio']
    
    temp_patth=(tempfile.NamedTemporaryFile(
        delete=False, 
        suffix=".webm"
        )).name
    audio_file.save(temp_patth)
    answer=speech_to_text(temp_patth)
    os.unlink(temp_patth)
    if not answer:
        answer = "Empty Text Recived"
    config = {"configurable": {"thread_id": thread_id}}
    agent.invoke({"messages":[{"role":"user","content":answer}]},config=config)
    question_count += 1
    if question_count > 5:
        closing_message=(
            "That contains our interview. "
            "Thank you for your time and thoughtful responses. "
            "i'll review your answers and provide feedback"
        )
        return (
        stream_audio(closing_message),
        {
            "Content-Type": "text/plain",
            "X-Question-Number": str(question_count),
            "X-Interview-Complete": "true"
        }
    )
    prompt=f"""  The candidate just answered question {question_count - 1}.
    
            Look at their ACTUAL answer above. Do NOT assume or make up what they said.
            
            Now ask question {question_count} of 5:
            1. Briefly acknowledge what they ACTUALLY said (1 sentence) - quote their exact words if needed
            2. Ask your next question that builds on their REAL response (1-2 sentences)
            3. If they said "I don't know" or gave a wrong answer, acknowledge that and ask something simpler
            4. Keep the TOTAL response under 3 sentences
            Be conversational but CONCISE. Only reference what they truly said."""
    respnse = agent.invoke(
        {
            "messages":[{"role":"user","content":prompt}]
            },config=config)
    question = respnse["messages"][-1].content
    #print(f"Question {question_count}: {question}")
    return (
        stream_audio(question), {
            "Content-Type": "text/plain", 
            "X-Question-Number": str(question_count),
            "X-Interview-Complete": "false"}
    )
@app.route("/get-feedback", methods=["POST"])
def get_feedback():
    config = {"configurable": {"thread_id": thread_id}}

    response= agent.invoke(
        {
            "messages":[
                {"role":"user",
                 "content":f"{FEEDBACK_PROMPT}\n Review  the entire interview on {current_subject}   and provide specific , detailed feedback based on their ACTUAL answers."}]
        },config=config)  
    text = response["messages"][-1].content
    print(f"\n[Feedback Generated]\n{text}\n")
    cleaned = text.strip()
    if "```" in cleaned:
        cleaned = cleaned.split("```")[1].replace("json", "").strip()
    feedback = json.loads(cleaned)

    return jsonify({"success": True, "feedback": feedback})

    #print(f"\n[Feedback Generated]n{text}\n")

app.run(debug=True, port=5000)