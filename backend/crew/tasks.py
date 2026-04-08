from crewai import Agent, Task


def build_tasks(
    interviewer: Agent,
    evaluator: Agent,
    coach: Agent,
    *,
    role: str,
    difficulty: str,
    interview_mode: str,
    resume_text: str,
    jd_text: str,
    spoken_response: str,
    coding_response: str,
    answer: str,
) -> list[Task]:
    resume_snippet = resume_text.strip()[:1800] or "No resume context provided."
    jd_snippet = jd_text.strip()[:1800] or "No job description provided."
    spoken_snippet = spoken_response.strip()[:1800] or "No spoken reasoning provided."
    coding_snippet = coding_response.strip()[:2200] or "No coding submission provided."
    answer_snippet = answer.strip()[:2200] or "No written answer provided."

    question_task = Task(
        agent=interviewer,
        description=(
            "Create exactly one interview question for role '{role}' at '{difficulty}' "
            "difficulty and mode '{interview_mode}'. The question must align with both "
            "the candidate resume and the target job description. Keep it under 35 words "
            "and avoid multi-part prompts.\n"
            "Use the candidate's latest response context to ask a meaningful follow-up; "
            "do not ignore what the candidate just said.\n\n"
            "If the candidate says they do not remember or are unsure, ask a simpler guided "
            "question or a hint-based follow-up instead of escalating difficulty.\n"
            "If the candidate asks for feedback or score, start your next output by briefly "
            "addressing that request before asking the next question.\n\n"
            "Resume Context:\n{resume}\n\n"
            "Job Description Context:\n{jd}\n\n"
            "Latest Spoken Response:\n{spoken}\n\n"
            "Latest Coding Response:\n{coding}\n\n"
            "Merged Candidate Answer Context:\n{answer}"
        ).format(
            role=role,
            difficulty=difficulty,
            interview_mode=interview_mode,
            resume=resume_snippet,
            jd=jd_snippet,
            spoken=spoken_snippet,
            coding=coding_snippet,
            answer=answer_snippet,
        ),
        expected_output="A single interview question as plain text.",
    )

    evaluation_task = Task(
        agent=evaluator,
        description=(
            "Evaluate this interview response in mode '{interview_mode}'.\n"
            "Spoken thought process:\n{spoken}\n\n"
            "Coding submission:\n{coding}\n\n"
            "Written answer:\n{answer}\n\n"
            "Score from 0 to 100 and provide concise feedback with emphasis on clarity, "
            "technical correctness, and role-fit against resume/JD context."
        ).format(
            interview_mode=interview_mode,
            spoken=spoken_snippet,
            coding=coding_snippet,
            answer=answer_snippet,
        ),
        context=[question_task],
        expected_output=(
            "JSON object with keys: score (integer), feedback (string), "
            "next_focus (string)."
        ),
    )

    coach_task = Task(
        agent=coach,
        description=(
            "Read previous context and return STRICT JSON only with keys:\n"
            "question (string), score (integer), feedback (string), next_focus (string).\n"
            "Do not wrap JSON in markdown."
        ),
        context=[question_task, evaluation_task],
        expected_output=(
            "Strict JSON with keys question, score, feedback, next_focus."
        ),
    )

    return [question_task, evaluation_task, coach_task]
