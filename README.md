# Hireme.ai

Hireme.ai is an AI interview coach that simulates a realistic technical interview flow based on candidate profile, role, and difficulty.

The project uses a modern React frontend and a FastAPI backend with a CrewAI-based multi-agent pipeline:
- Interviewer: asks adaptive interview questions
- Evaluator: scores technical quality and thought process
- Coach: provides actionable feedback and next focus areas

## Tech Stack

- Frontend: React, Vite, TypeScript, Framer Motion
- Backend: FastAPI, CrewAI, LiteLLM, MongoDB Atlas, JWT auth
- LLM Provider: Groq (primary), with local provider compatibility in code

## Project Structure

```text
frontend/
  src/
backend/
  crew/
  llm/
  routes/
render.yaml
```

## Local Development

### 1) Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload --port 8000
```

Health check:

```text
GET http://localhost:8000/health
```

### 2) Frontend

```powershell
cd frontend
npm install
npm run dev
```

App URL:

```text
http://localhost:5173
```

## Backend Environment Variables (Groq)

Set these in `backend/.env` for local run and Render:

```env
APP_MODE=local
LLM_PROVIDER=groq
GROQ_MODEL=llama-3.1-8b-instant
GROQ_API_KEYS=your-groq-api-key
LLM_TEMPERATURE=0.2
ALLOWED_ORIGINS=http://localhost:5173,https://hiremeai.vercel.app
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?appName=Cluster0
MONGODB_DB_NAME=interview_copilot
JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
FRONTEND_OAUTH_SUCCESS_URL=https://hiremeai.vercel.app
FRONTEND_OAUTH_FAILURE_URL=https://hiremeai.vercel.app
```

## Deploy Backend On Render

This repository includes a Render Blueprint file at `render.yaml`.

### Option A: Blueprint Deploy (recommended)

1. Push this repository to GitHub.
2. In Render, choose New + Blueprint and connect the GitHub repo.
3. Render will detect `render.yaml` and create the backend service.
4. Add required secret env vars in Render:
   - `GROQ_API_KEYS`
   - `MONGODB_URI`
   - `JWT_SECRET_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (use your Render backend URL callback)

### Option B: Manual Web Service

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

## API Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/interview/turn`
- `GET /health`

## Frontend Deployment

Frontend can be deployed independently on Vercel from the `frontend` directory.
