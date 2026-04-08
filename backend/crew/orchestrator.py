import json
import os
import re
from time import perf_counter

from crewai import Crew, Process

from crew.agents import build_agents
from crew.tasks import build_tasks
from llm.local_llm import get_candidate_providers


QUESTION_BANK: dict[str, str] = {
    "frontend-engineer": "How would you prevent performance regressions in a React dashboard used by multiple teams?",
    "backend-engineer": "How would you design idempotent payment webhook processing under retries and partial failures?",
    "fullstack-engineer": "How would you divide ownership between frontend and backend for a collaborative editor feature?",
    "sde-intern": "Tell me about a project where you learned fast and still delivered measurable results.",
}


def _extract_focus_terms(resume_text: str, jd_text: str) -> list[str]:
    stop_words = {
        "and",
        "for",
        "the",
        "are",
        "with",
        "from",
        "that",
        "this",
        "have",
        "will",
        "your",
        "using",
        "build",
        "built",
        "about",
        "into",
        "their",
        "there",
        "where",
        "which",
        "skills",
        "experience",
        "years",
        "team",
    }

    text = f"{resume_text} {jd_text}".lower()
    tokens = re.findall(r"[a-z][a-z0-9\-]{2,}", text)

    ranked: dict[str, int] = {}
    for token in tokens:
        if token in stop_words or token.isdigit():
            continue
        ranked[token] = ranked.get(token, 0) + 1

    sorted_terms = sorted(ranked.items(), key=lambda item: item[1], reverse=True)
    return [term for term, _ in sorted_terms[:3]]


def _compose_demo_question(
    role: str,
    interview_mode: str,
    resume_text: str,
    jd_text: str,
    latest_response: str,
) -> str:
    base_question = QUESTION_BANK.get(role, QUESTION_BANK["fullstack-engineer"])
    focus_terms = _extract_focus_terms(resume_text, jd_text)
    latest_response = re.sub(r"\s+", " ", latest_response).strip()

    if latest_response:
        clipped = latest_response[:140].rstrip(" ,.;")
        if interview_mode == "live-coding":
            return (
                f'You mentioned "{clipped}". Implement a focused solution for that scenario '
                "and explain tradeoffs and complexity."
            )

        return (
            f'You mentioned "{clipped}". What tradeoff did you prioritize and how would '
            "you improve this in production?"
        )

    if interview_mode == "live-coding":
        coding_question = (
            "Design and implement a solution while narrating your decisions, then explain "
            "tradeoffs and complexity."
        )
        if focus_terms:
            return f"{coding_question} Prioritize context around {', '.join(focus_terms)}."
        return coding_question

    if focus_terms:
        return f"{base_question} Tie your response to {', '.join(focus_terms)}."

    return base_question


def _demo_turn(
    role: str,
    difficulty: str,
    interview_mode: str,
    resume_text: str,
    jd_text: str,
    spoken_response: str,
    coding_response: str,
    answer: str,
) -> dict[str, str | int]:
    merged_answer = "\n\n".join(
        segment.strip()
        for segment in [spoken_response, coding_response, answer]
        if segment.strip()
    )

    base_score = min(88, 50 + len(merged_answer.strip()) // 6)
    if "tradeoff" in merged_answer.lower() or "impact" in merged_answer.lower():
        base_score += 6
    if coding_response.strip():
        base_score += 4
    if difficulty == "hard":
        base_score -= 3

    score = max(45, min(95, base_score))
    question = _compose_demo_question(
        role,
        interview_mode,
        resume_text,
        jd_text,
        merged_answer,
    )

    return {
        "question": question,
        "score": score,
        "feedback": (
            "Strong thought process and good ownership. Improve by verbalizing one key "
            "tradeoff and validating your coding decisions with a quick test case."
            if score >= 75
            else "Add structure: context, decision, implementation plan, and measurable result."
        ),
        "next_focus": (
            "Practice coding while narrating constraints, complexity, and fallback options."
            if interview_mode == "live-coding"
            else "Practice concise STAR-style responses with one metric and one tradeoff."
        ),
        "mode": "demo",
    }


def _extract_json(raw_output: object) -> dict[str, str | int]:
    output_text = getattr(raw_output, "raw", str(raw_output)).strip()
    start = output_text.find("{")
    end = output_text.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError("Could not locate JSON object in Crew output.")

    payload = json.loads(output_text[start : end + 1])

    return {
        "question": str(payload.get("question", "")),
        "score": int(payload.get("score", 0)),
        "feedback": str(payload.get("feedback", "")),
        "next_focus": str(payload.get("next_focus", "")),
        "mode": "local-ai",
    }


def run_interview_turn(
    *,
    role: str,
    difficulty: str,
    interview_mode: str,
    resume_text: str,
    jd_text: str,
    spoken_response: str,
    coding_response: str,
    answer: str,
) -> dict[str, str | int]:
    start = perf_counter()
    app_mode = os.getenv("APP_MODE", "local").lower()

    if app_mode == "demo":
        result = _demo_turn(
            role,
            difficulty,
            interview_mode,
            resume_text,
            jd_text,
            spoken_response,
            coding_response,
            answer,
        )
        result["latency_ms"] = int((perf_counter() - start) * 1000)
        return result

    provider_candidates = get_candidate_providers()
    if not provider_candidates:
        result = _demo_turn(
            role,
            difficulty,
            interview_mode,
            resume_text,
            jd_text,
            spoken_response,
            coding_response,
            answer,
        )
        result["latency_ms"] = int((perf_counter() - start) * 1000)
        return result

    merged_answer = "\n\n".join(
        segment.strip()
        for segment in [spoken_response, coding_response, answer]
        if segment.strip()
    )

    for provider in provider_candidates:
        try:
            interviewer, evaluator, coach = build_agents(provider)
            tasks = build_tasks(
                interviewer,
                evaluator,
                coach,
                role=role,
                difficulty=difficulty,
                interview_mode=interview_mode,
                resume_text=resume_text,
                jd_text=jd_text,
                spoken_response=spoken_response,
                coding_response=coding_response,
                answer=merged_answer,
            )

            crew = Crew(
                agents=[interviewer, evaluator, coach],
                tasks=tasks,
                process=Process.sequential,
                verbose=False,
            )

            output = crew.kickoff()
            result = _extract_json(output)
            result["latency_ms"] = int((perf_counter() - start) * 1000)
            return result
        except Exception:
            import traceback

            print(f"[orchestrator] Provider failed: {provider}")
            traceback.print_exc()

    result = _demo_turn(
        role,
        difficulty,
        interview_mode,
        resume_text,
        jd_text,
        spoken_response,
        coding_response,
        answer,
    )
    result["latency_ms"] = int((perf_counter() - start) * 1000)
    return result
