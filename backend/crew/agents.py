from crewai import Agent

from llm.local_llm import build_local_llm


def build_agents(provider: str) -> tuple[Agent, Agent, Agent]:
    llm = build_local_llm(provider)

    interviewer = Agent(
        role="Interviewer",
        goal="Create a focused and role-specific interview question.",
        backstory=(
            "You are a hiring panel interviewer who asks one sharp question aligned "
            "to role and difficulty."
        ),
        llm=llm,
        allow_delegation=False,
        verbose=False,
    )

    evaluator = Agent(
        role="Evaluator",
        goal="Score candidate answer quality from 0 to 100 with rubric precision.",
        backstory=(
            "You evaluate clarity, structure, technical depth, tradeoff awareness, "
            "and impact orientation."
        ),
        llm=llm,
        allow_delegation=False,
        verbose=False,
    )

    coach = Agent(
        role="Coach",
        goal="Convert raw analysis into actionable, concise coaching output.",
        backstory=(
            "You produce practical interview coaching with one immediate next step "
            "for candidate improvement."
        ),
        llm=llm,
        allow_delegation=False,
        verbose=False,
    )

    return interviewer, evaluator, coach
