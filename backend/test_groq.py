from llm.local_llm import build_local_llm
from crew.orchestrator import run_interview_turn

try:
    print("Building LLM...")
    llm = build_local_llm()
    print("LLM Model:", llm.model)
    
    print("Running turn...")
    result = run_interview_turn(
        role="frontend-engineer",
        difficulty="easy",
        interview_mode="behavioral",
        resume_text="I am a frontend developer.",
        jd_text="seeking react dev.",
        spoken_response="hello",
        coding_response="",
        answer=""
    )
    import json
    print(json.dumps(result, indent=2))
except Exception as e:
    import traceback
    traceback.print_exc()
