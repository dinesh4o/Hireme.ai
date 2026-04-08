export type InterviewRole =
  | 'frontend-engineer'
  | 'backend-engineer'
  | 'fullstack-engineer'
  | 'sde-intern'

export type InterviewDifficulty = 'easy' | 'medium' | 'hard'
export type InterviewMode = 'live-coding' | 'behavioral' | 'system-design'

export interface InterviewTurnRequest {
  role: InterviewRole
  difficulty: InterviewDifficulty
  interview_mode: InterviewMode
  resume_text: string
  jd_text: string
  spoken_response: string
  coding_response: string
  answer: string
}

export interface InterviewTurnResponse {
  question: string
  score: number
  feedback: string
  next_focus: string
  mode: 'local-ai' | 'demo'
  latency_ms: number
}

export interface InterviewTurnState {
  status: 'idle' | 'loading' | 'success' | 'error'
  result: InterviewTurnResponse | null
  errorMessage: string | null
  infoMessage: string | null
}
