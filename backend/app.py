import base64

from flask import Flask,request
import requests
import json
from flask_cors import CORS
from dotenv import load_dotenv
import os
from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import InMemorySaver
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

#print("GROQ_API_KEY:", GROQ_API_KEY)

model=ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=GROQ_API_KEY,

)
checkpointer=InMemorySaver()
agent=create_agent(
    model=model,
    tools=[],
    checkpointer=checkpointer
)
MURF_API_KEY = os.getenv("MURF_API_KEY")
def stream_audio(text): #Generator
        url = "https://global.api.murf.ai/v1/speech/stream"
        headers = {
            "api-key": MURF_API_KEY,
            "Content-Type": "application/json"
        }
        data = {
        "voice_id": "Natalie",
        "style": "Conversation",
        "text": text,
        "locale": "en-US",
        "model": "FALCON",
        "format": "MP3",
        "sampleRate": 24000,
        "channelType": "MONO"
        }

        response = requests.post(
             url, 
             headers=headers, 
             json=data, 
             stream=True
             )

        if response.status_code == 200:
            
                for chunk in response.iter_content(chunk_size=4096):
                    if chunk:
                        yield base64.b64encode(chunk).decode('utf-8') + "\n" 
                        
            
        else:
            print(f"Error: {response.status_code}")


current_subject=""
question_count=0
thread_id="interview_session_1"
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
app = Flask(__name__)
CORS(app)


@app.route('/start-interview', methods=['POST'])
def start_interview():
    global current_subject, question_count, agent, checkpointer
    
    # Handle the POST request for starting the interview
    data=request.json
    current_subject=data.get("subject","Python")
    question_count=1

    checkpointer=InMemorySaver()  # Reset the checkpointer for a new interview session
    agent=create_agent(
        model=model,
        tools=[],
        checkpointer=checkpointer
    )
    formated_prompt=INTERVIEW_PROMPT.format(subject=current_subject)
    config={
        "configurable":{
            "thread_id":thread_id,
        }
    }
    response=agent.invoke({
        "messages":[{"role":"system","content":formated_prompt},
                    {'role':"user","content":"Start the interview with warm greeting and ask the first question about {current_subject}.Keep it SHORT and CRISP (1-2 sentences)."}],
    },config=config)
    question=response['messages'][-1].content
    return stream_audio(question),{'Content-Type': 'text/plain'}


if __name__ == '__main__':
    app.run(debug=True, port=5000)
