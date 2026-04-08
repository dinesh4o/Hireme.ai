import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.interview import router as interview_router

backend_env_file = Path(__file__).resolve().parent / ".env"
load_dotenv(backend_env_file, override=True)

app = FastAPI(
    title="Hireme.ai API",
    version="0.1.0",
    description="CrewAI-powered adaptive interview and feedback API.",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    llm_provider = os.getenv("LLM_PROVIDER", "ollama")
    if llm_provider == "groq":
        model_name = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    elif llm_provider in {"lmstudio", "openai"}:
        model_name = os.getenv("LMSTUDIO_MODEL", "")
    else:
        model_name = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")

    return {
        "status": "ok",
        "mode": os.getenv("APP_MODE", "local"),
        "llm_provider": llm_provider,
        "model": model_name or "auto-discover",
    }


app.include_router(interview_router)
app.include_router(auth_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

