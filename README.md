# 🎙️ AI Interview Platform

> A full-stack, voice-based AI interview platform that conducts realistic, time-based interviews and personalizes the conversation using the candidate's uploaded resume.

![Python](https://img.shields.io/badge/Python-3.13-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)
![JavaScript](https://img.shields.io/badge/JavaScript-Frontend-F7DF1E?logo=javascript)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite)
![JWT](https://img.shields.io/badge/Auth-JWT-black?logo=jsonwebtokens)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Project Overview

AI Interview Platform simulates a realistic technical interview using conversational AI and voice processing.

The platform is designed around a simple idea:

```text
Candidate speaks naturally
        ↓
AI understands the response
        ↓
AI evaluates the answer
        ↓
AI adapts the next question
        ↓
AI uses the candidate's resume
        ↓
Interview becomes personalized
```

Unlike a fixed question bank, the current system supports **time-based interviews**, conversational memory, answer analysis, persistent interview records, and resume-aware questioning.

---

# ✨ Current Features

## 🔐 Authentication

- User registration and login
- JWT-based authentication
- Protected backend APIs
- User-specific interview and resume data
- Password hashing

## ⏱️ Time-Based Interviews

The interview is controlled by a server-side expiration time.

| Capability | Status |
| --- | --- |
| Configurable interview duration | ✅ |
| Live countdown timer | ✅ |
| Server-controlled expiration | ✅ |
| Manual interview completion | ✅ |
| Graceful timeout | ✅ |
| Persistent interview records | ✅ |

The candidate is not interrupted in the middle of an answer when the timer reaches the end. The backend completes the interview at the appropriate lifecycle point.

---

# 📄 Resume-Based Interview

The dashboard now provides a user-facing resume upload workflow.

A candidate can:

1. Log in
2. Upload a PDF resume from the dashboard
3. Let the backend extract the resume text
4. Generate a structured candidate profile
5. Start an interview using that profile
6. Receive questions based on their actual skills and projects
7. Receive resume-aware follow-up questions

### Resume processing pipeline

```text
                    Dashboard
                        │
                        ▼
                 Upload Resume PDF
                        │
                        ▼
              POST /resume/upload
                        │
                        ▼
             Validate PDF + File Size
                        │
                        ▼
                Secure File Storage
                        │
                        ▼
                 PDF Text Extraction
                        │
                        ▼
              Candidate Profile Builder
                        │
                        ▼
                Pydantic Validation
                        │
                        ▼
             Candidate Profile Persistence
                        │
                        ▼
                 Resume Ready
```

### Candidate profile

The resume is converted into structured data similar to:

```json
{
  "name": "Candidate Name",
  "education": [],
  "skills": [],
  "projects": [],
  "experience": [],
  "certifications": []
}
```

This profile becomes the structured source used by the interview personalization layer.

---

# 🤖 Resume-Aware Interview Flow

The current interview workflow is:

```text
Login
  │
  ▼
Dashboard
  │
  ├── Upload Resume
  │        │
  │        ▼
  │   Candidate Profile
  │
  ▼
Select Interview Topic
  │
  ▼
Select Duration
  │
  ▼
Start Interview
  │
  ▼
Personalized Welcome
  │
  ▼
Resume-Aware Question #1
  │
  ▼
Candidate Voice Answer
  │
  ▼
AssemblyAI Speech → Text
  │
  ▼
Answer Analysis
  │
  ├── Relevance
  ├── Correctness
  ├── Clarity
  ├── Depth
  ├── Strengths
  ├── Knowledge Gaps
  └── Difficulty Recommendation
  │
  ▼
Resume-Aware Follow-Up
  │
  ▼
Repeat Until Interview Ends
  │
  ▼
Final Evaluation
  │
  ▼
Candidate Feedback
```

For example, when a resume contains an **AI Job Search Agent using LangChain and Gemini**, the interviewer can ask about that actual project rather than starting with an unrelated generic question.

---

# 🎙️ Voice Interview Pipeline

```text
AI Question
    │
    ▼
Murf AI
    │
    ▼
Interviewer Voice
    │
    ▼
Candidate Listens
    │
    ▼
Browser MediaRecorder
    │
    ▼
Audio Upload
    │
    ▼
AssemblyAI
    │
    ▼
Transcript
    │
    ▼
LLM Answer Analysis
    │
    ▼
Adaptive Follow-Up
```

The platform therefore combines both **text-based LLM reasoning** and **real-time speech processing**.

---

# 🧠 AI Architecture

| Component | Purpose |
| --- | --- |
| Groq LLM | Interview generation, answer analysis, feedback |
| LangChain | LLM orchestration and prompt handling |
| LangGraph | Conversation memory and interview context |
| AssemblyAI | Speech-to-text |
| Murf AI | Text-to-speech |
| FastAPI | Backend API and orchestration |
| Pydantic | Request and candidate-profile validation |
| SQLAlchemy | Database ORM |
| SQLite | Persistent local database |
| JWT | Authentication and authorization |

---

# 🧩 Interview Intelligence

The interviewer does not only generate the next question.

After each answer, the backend analyzes:

```text
Relevance
Correctness
Clarity
Depth
Strengths
Knowledge Gaps
Difficulty Recommendation
```

The difficulty recommendation can be:

```text
increase
maintain
decrease
```

This allows the interviewer to adjust the technical depth of future questions.

The existing answer-analysis layer is also used by the fallback LangGraph interviewer when a resume-aware follow-up cannot be generated.

---

# 💾 Database Design

Current persistence includes resume, candidate-profile, interview, question, answer, analysis, and evaluation data.

Simplified structure:

```text
User
 ├── id
 ├── email
 └── hashed_password

Resume
 ├── id
 ├── user_id
 ├── original_filename
 ├── stored_filename
 ├── file_path
 ├── content_type
 ├── file_size
 ├── file_hash
 ├── extracted_text
 └── uploaded_at

CandidateProfileRecord
 ├── id
 ├── resume_id
 ├── profile_data
 ├── schema_version
 ├── model_name
 ├── generated_at
 └── updated_at

Interview
 ├── id
 ├── user_id
 ├── subject
 ├── duration_minutes
 ├── status
 ├── started_at
 ├── expires_at
 └── ended_at

InterviewQuestion
 ├── id
 ├── interview_id
 ├── question_number
 ├── question_text
 └── asked_at

InterviewAnswer
 ├── id
 ├── question_id
 ├── transcript
 ├── word_count
 └── answered_at

InterviewAnswerAnalysis
 ├── id
 ├── answer_id
 ├── relevance_score
 ├── correctness_score
 ├── clarity_score
 ├── depth_score
 ├── strengths
 ├── knowledge_gaps
 └── difficulty_recommendation

InterviewEvaluation
 └── Final interviewer-level evaluation
```

---

# 🔄 Interview Lifecycle

The interview has three important runtime stages:

```text
Idle
  │
  ▼
Welcome
  │
  │ Candidate clicks "I'm Ready"
  ▼
Active
  │
  ├── Questions
  ├── Voice Answers
  ├── Analysis
  └── Follow-Ups
  │
  ▼
Completed
```

The timer starts when the actual interview begins, not while the candidate is reading the personalized welcome.

---

# 🌐 API Overview

## Authentication

```text
POST /auth/register
POST /auth/login
GET  /auth/me
```

## Resume

```text
POST /resume/upload
```

The resume endpoint is protected by JWT authentication and processes:

```text
PDF
 ↓
Validation
 ↓
Storage
 ↓
Text Extraction
 ↓
Candidate Profile Generation
 ↓
Candidate Profile Persistence
```

## Interview

```text
POST /start-interview
POST /submit-answer
POST /end-interview
POST /get-feedback
```

`/start-interview` supports the interview lifecycle stages used by the frontend:

```text
stage = "welcome"
stage = "begin"
```

## Dashboard

```text
GET  /auth/dashboard/stats
POST /auth/dashboard/save-feedback
```

---

# 📁 Project Structure

```text
AI-Interview-Platform/
│
├── backend/
│   ├── app.py
│   ├── auth.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   │
│   ├── routes/
│   │   ├── auth.py
│   │   └── resume.py
│   │
│   └── services/
│       ├── resume_storage.py
│       ├── resume_parser.py
│       ├── profile_builder.py
│       ├── profile_persistence.py
│       ├── interviewer_welcome.py
│       ├── resume_question_generator.py
│       └── resume_followup_generator.py
│
├── frontend/
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── dashboard.js
│   ├── index.html
│   └── index.js
│
├── storage/
│   └── resumes/
│
├── interview_platform.db
├── .env
├── .gitignore
└── README.md
```

Uploaded resume files are stored under `storage/resumes/`, and that directory should not be committed to Git.

---

# ⚙️ Local Development Setup

## 1. Clone the repository

```bash
git clone https://github.com/abhinavsai830-lang/AI-Interview-Platform.git
cd AI-Interview-Platform
```

## 2. Create and activate a virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

## 3. Install backend dependencies

```powershell
pip install -r backend/requirements.txt
```

## 4. Configure environment variables

Create `.env` in the project root or the location expected by the application.

Example:

```env
JWT_SECRET_KEY=your_secret_key
GROQ_API_KEY=your_groq_key
GROQ_MODEL=your_groq_model
ASSEMBLYAI_API_KEY=your_assemblyai_key
MURF_API_KEY=your_murf_key
```

Never commit real API keys.

## 5. Start the FastAPI backend

```powershell
uvicorn backend.app:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

## 6. Start the frontend

Open another terminal:

```powershell
cd frontend
python -m http.server 5500
```

Frontend:

```text
http://127.0.0.1:5500/login.html
```

Using an HTTP server for the frontend is recommended instead of opening the HTML files directly with `file:///`.

---

# 🧪 Development Verification

Before committing changes:

```powershell
python -m compileall backend
git diff --check
git status
```

For resume functionality, verify:

```text
1. Login
2. Open Dashboard
3. Select a PDF resume
4. Upload the resume
5. Confirm "Resume ready"
6. Start an interview
7. Confirm personalized welcome
8. Confirm resume-aware Question #1
9. Answer through voice
10. Confirm the next response uses the interview context
```

---

# 📈 Development Progress

## ✅ Completed

- [x] User Registration
- [x] User Login
- [x] JWT Authentication
- [x] Protected Interview APIs
- [x] Time-Based Interview Engine
- [x] Live Countdown Timer
- [x] Voice Recording
- [x] AssemblyAI Speech-to-Text
- [x] Murf AI Text-to-Speech
- [x] Conversation Memory with LangGraph
- [x] Interview Persistence
- [x] Answer Persistence
- [x] Answer Quality Analysis
- [x] Adaptive Difficulty Recommendation
- [x] Interviewer-Level Evaluation
- [x] Resume PDF Upload API
- [x] Secure Resume Storage
- [x] Resume Text Extraction
- [x] Candidate Profile Schema
- [x] Candidate Profile Generation
- [x] Candidate Profile Persistence
- [x] Personalized Interview Welcome
- [x] Resume-Aware First Interview Question
- [x] Resume-Aware Follow-Up Questions
- [x] User-Facing Resume Upload Dashboard
- [x] Resume Upload Validation
- [x] Resume-Required Interview Guard

## 🚧 Next Development Areas

- [ ] Topic and Skill Coverage State
- [ ] Intelligent Topic Selection Across the Interview
- [ ] Long-Horizon Interview Orchestration
- [ ] Professional Interview Report / PDF
- [ ] Interview Analytics
- [ ] Stronger production observability
- [ ] Evaluation and LLMOps pipeline
- [ ] PostgreSQL production deployment
- [ ] Advanced company-specific interview modes

---

# 🏗️ Current Development Branch

Resume-based interview development is being implemented on:

```text
feature/resume-based-interview-v2
```

The stable time-based implementation should not be modified directly.

---

# 🔒 Security Notes

The resume upload flow currently validates:

- PDF file type
- PDF signature
- File size limit
- Authenticated ownership
- Server-generated storage names
- SHA-256 file hash
- Safe storage paths

The backend, rather than the browser alone, is responsible for enforcing authenticated access and resume availability.

---

# 🤝 Contributing

Create a feature branch:

```bash
git checkout -b feature/your-feature
```

Verify your changes:

```bash
python -m compileall backend
git diff --check
```

Commit:

```bash
git commit -m "Describe your change"
```

Push:

```bash
git push origin feature/your-feature
```

---

# 👨‍💻 Author

**Abhinav Sai Guda**

Building AI-powered software engineering projects with FastAPI, Generative AI, LangChain, LangGraph, and modern backend architecture.

GitHub: [abhinavsai830-lang](https://github.com/abhinavsai830-lang)

---

⭐ If you find the project useful, consider giving it a star on GitHub.
