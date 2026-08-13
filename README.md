# AI Interview Platform

An AI-powered interview preparation platform that conducts technical interviews based on user-selected topics and provides AI-generated feedback after the interview.

## Features
 Email/password registration and login
- JWT-protected interview APIs
- SQLite development persistence with `DATABASE_URL` override for production databases
- Voice-based interviews
- Select interview topics
- AI-generated interview questions
- Interactive, user-specific interview sessions- Streaming AI responses
- Detailed AI feedback
- Simple and responsive web interface
- FastAPI asynchronous backend

## Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- FastAPI
- Python
- SQLAlchemy
- SQLite/PostgreSQL-compatible database configuration
- Passlib/bcrypt password hashing
- JWT authentication
- LangChain
- AI Agent
- LangGraph
- Groq LLM
  

## Backend Setup

1. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Create a backend environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```
3. Set `JWT_SECRET_KEY` in `backend/.env` to a long random string. Optionally set `DATABASE_URL`; otherwise the app uses SQLite at `interview_platform.db`.
4. Run the API from the repository root:
   ```bash
   uvicorn backend.app:app --reload
   ```

## Auth API

- `POST /auth/register` with `{ "email": "user@example.com", "password": "..." }`
- `POST /auth/login` with `{ "email": "user@example.com", "password": "..." }`
- `GET /auth/me` with `Authorization: Bearer <token>`

Interview endpoints require the same bearer token:

- `POST /start-interview`
- `POST /submit-answer`
- `POST /get-feedback`


## Future Improvements

- 🎯 AI-powered adaptive interview sessions
- Interview history
- Performance analytics
- Resume-based interview generation
