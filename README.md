# 🎙️ AI Interview Platform

> A full-stack AI-powered mock interview platform that conducts realistic voice interviews with authentication, timed sessions, conversation memory, and personalized feedback.

![Python](https://img.shields.io/badge/Python-3.13-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)
![JavaScript](https://img.shields.io/badge/JavaScript-Frontend-F7DF1E?logo=javascript)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Project Overview

AI Interview Platform simulates a real technical interview where candidates answer questions using their voice. Instead of limiting interviews to a fixed number of questions, the platform conducts a **time-based interview**, remembers the entire conversation, stores every question and answer, and generates AI-driven feedback at the end.

### Current capabilities

* 🔐 User Registration & Login (JWT Authentication)
* ⏱️ Time-based interview sessions
* 🎤 Voice recording and speech transcription
* 🤖 AI-generated interview questions
* 💾 Persistent interview history
* 📊 Personalized interview feedback
* 🎯 Multiple interview subjects

---

# ✨ Features

## 🔐 Authentication

* Secure JWT-based login & registration
* Password hashing
* Protected interview APIs
* User-specific interview history

## ⏱️ Timed Interview Engine

Unlike traditional mock interview apps that ask only 5 questions, this platform asks **as many relevant questions as possible within the selected duration**.

| Feature                     | Status |
| --------------------------- | ------ |
| Dynamic question generation | ✅      |
| Configurable duration       | ✅      |
| Live countdown timer        | ✅      |
| Graceful timeout            | ✅      |
| Manual interview completion | ✅      |

---

## 🎙️ Voice Interview Flow

```text
User Login
     │
     ▼
Select Subject
     │
     ▼
Start Timed Interview
     │
     ▼
AI asks Question
     │
     ▼
Record Voice Answer
     │
     ▼
Speech → Text
     │
     ▼
AI generates next question
     │
     ▼
Save question & answer
     │
     ▼
Repeat until timer ends
     │
     ▼
Generate Final Feedback
```

---

# 🧠 AI Pipeline

The platform combines multiple AI services into one interview workflow.

| Component  | Purpose                      |
| ---------- | ---------------------------- |
| Groq LLM   | Generate interview questions |
| AssemblyAI | Speech-to-text transcription |
| Murf AI    | Natural interviewer voice    |
| FastAPI    | Backend APIs                 |
| SQLite     | Persistent storage           |

---

# 💾 Database Design

Current database structure:

```text
User
 ├── id
 ├── email
 └── password_hash

Interview
 ├── id
 ├── user_id
 ├── subject
 ├── duration_minutes
 ├── status
 ├── started_at
 └── expires_at

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
```

### What is stored?

* Every interview session
* Every generated question
* Every spoken answer
* Word count
* Interview status (Active / Completed)
* Start & end timestamps

---

# 📊 Interview Lifecycle

The interview follows a complete lifecycle instead of stopping abruptly.

```text
Start Interview
      │
      ▼
Status = Active
      │
      ▼
Questions & Answers Saved
      │
      ▼
Timer Reaches 00:00
      │
      ▼
Candidate finishes current answer
      │
      ▼
Status = Completed
      │
      ▼
Generate AI Feedback
```

This prevents interrupting candidates while they're speaking.

---

# 🛠️ Tech Stack

| Category           | Technology            |
| ------------------ | --------------------- |
| Frontend           | HTML, CSS, JavaScript |
| Backend            | FastAPI               |
| Database           | SQLite + SQLAlchemy   |
| Authentication     | JWT                   |
| AI Model           | Groq                  |
| Speech Recognition | AssemblyAI            |
| Text to Speech     | Murf AI               |

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
│   └── routes/
│
├── frontend/
│   ├── index.html
│   ├── index.js
│   └── style.css
│
├── interview.db
├── requirements.txt
└── README.md
```

---

# ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/abhinavsai830-lang/AI-Interview-Platform.git
cd AI-Interview-Platform
```

### 2. Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Configure environment

Create a `.env` file inside `backend/`.

```env
JWT_SECRET_KEY=your_secret_key
GROQ_API_KEY=your_groq_key
ASSEMBLYAI_API_KEY=your_assembly_key
MURF_API_KEY=your_murf_key
```

### 4. Run the backend

```bash
uvicorn backend.app:app --reload
```

### 5. Open the frontend

Open `frontend/index.html` in your browser.

---

# 🎯 Supported Interview Topics

* Python
* Generative AI
* Self Introduction
* English
* HTML
* CSS

More subjects can be added dynamically.

---

# 📈 Development Progress

## ✅ Completed

* [x] User Authentication
* [x] JWT Authorization
* [x] Protected APIs
* [x] Time-based Interview Engine
* [x] Live Countdown Timer
* [x] Voice Recording
* [x] Speech Transcription
* [x] AI Question Generation
* [x] Interview Persistence
* [x] Graceful Timeout Handling
* [x] Personalized Feedback

## 🚧 Coming Soon

* [ ] Professional Dashboard UI
* [ ] Separate Login & Register Pages
* [ ] Interview Analytics
* [ ] Resume Upload
* [ ] PDF Feedback Report
* [ ] Leaderboard & Performance Tracking

---

# 🤝 Contributing

Contributions, suggestions, and feature requests are welcome.

```bash
# Create feature branch
git checkout -b feature/your-feature

# Commit changes
git commit -m "Add your feature"

# Push branch
git push origin feature/your-feature
```

---

# 👨‍💻 Author

**Abhinav Sai**

Building AI-powered software engineering projects with FastAPI, Generative AI, and modern backend architecture.

If you found this project useful, consider giving it a ⭐ on GitHub.
