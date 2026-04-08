from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from crew.orchestrator import run_interview_turn
from security import CurrentUser, get_current_user

router = APIRouter(prefix="/api/interview", tags=["interview"])


class InterviewTurnRequest(BaseModel):
    role: Literal[
        "frontend-engineer",
        "backend-engineer",
        "fullstack-engineer",
        "sde-intern",
    ]
    difficulty: Literal["easy", "medium", "hard"]
    interview_mode: Literal["live-coding", "behavioral", "system-design"] = "live-coding"
    resume_text: str = Field(default="", max_length=16000)
    jd_text: str = Field(default="", max_length=16000)
    spoken_response: str = Field(default="", max_length=12000)
    coding_response: str = Field(default="", max_length=12000)
    answer: str = Field(default="", max_length=12000)


class InterviewTurnResponse(BaseModel):
    question: str
    score: int = Field(..., ge=0, le=100)
    feedback: str
    next_focus: str
    mode: Literal["local-ai", "demo"]
    latency_ms: int = Field(..., ge=0)


@router.post("/turn", response_model=InterviewTurnResponse)
def run_turn(
    payload: InterviewTurnRequest,
    _: CurrentUser = Depends(get_current_user),
) -> InterviewTurnResponse:
    try:
        result = run_interview_turn(
            role=payload.role,
            difficulty=payload.difficulty,
            interview_mode=payload.interview_mode,
            resume_text=payload.resume_text,
            jd_text=payload.jd_text,
            spoken_response=payload.spoken_response,
            coding_response=payload.coding_response,
            answer=payload.answer,
        )
        return InterviewTurnResponse(**result)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
