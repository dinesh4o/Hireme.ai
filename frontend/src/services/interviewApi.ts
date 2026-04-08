import {
  type InterviewTurnRequest,
  type InterviewTurnResponse,
} from '../features/interview/types'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const isDemoModeEnabled =
  (import.meta.env.VITE_DEMO_MODE ?? 'false').toLowerCase() === 'true'

const interviewEndpoint = apiBaseUrl
  ? `${apiBaseUrl}/api/interview/turn`
  : '/api/interview/turn'

const questionByRole: Record<InterviewTurnRequest['role'], string> = {
  'frontend-engineer':
    'How would you design a component architecture for a dashboard that scales across multiple product squads?',
  'backend-engineer':
    'How would you design an API that handles high throughput while preserving idempotency and traceability?',
  'fullstack-engineer':
    'How do you split responsibilities between frontend and backend for a real-time collaborative feature?',
  'sde-intern':
    'Tell me about a project where you learned a hard concept quickly and delivered under a deadline.',
}

const codingQuestionByRole: Record<InterviewTurnRequest['role'], string> = {
  'frontend-engineer':
    'Build a reusable component strategy and implement one interactive widget while narrating state, performance, and accessibility tradeoffs.',
  'backend-engineer':
    'Implement an idempotent API handler and explain failure handling, retries, and observability decisions as you code.',
  'fullstack-engineer':
    'Implement a minimal collaborative feature flow and explain API boundaries, optimistic UI, and conflict resolution tradeoffs.',
  'sde-intern':
    'Solve a coding problem step-by-step while verbalizing assumptions, complexity, and final validation tests.',
}

const ignoredTerms = new Set([
  'and',
  'for',
  'the',
  'are',
  'with',
  'from',
  'that',
  'this',
  'have',
  'will',
  'your',
  'using',
  'build',
  'built',
  'skills',
  'years',
  'team',
  'role',
])

function extractFocusTerms(resumeText: string, jdText: string): string[] {
  const tokens = `${resumeText} ${jdText}`.toLowerCase().match(/[a-z][a-z0-9\-]{2,}/g)
  if (!tokens) {
    return []
  }

  const counts = new Map<string, number>()
  for (const token of tokens) {
    if (ignoredTerms.has(token)) {
      continue
    }
    counts.set(token, (counts.get(token) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([term]) => term)
}

function combineAnswer(request: InterviewTurnRequest): string {
  return [request.spoken_response, request.coding_response, request.answer]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')
}

function estimateScore(answer: string, codingResponse: string): number {
  const lengthScore = Math.min(40, Math.floor(answer.trim().length / 8))
  const structureBoost = /because|therefore|tradeoff|impact|result/i.test(answer)
    ? 20
    : 10
  const confidenceBoost = /i built|i designed|i optimized|i improved/i.test(answer)
    ? 20
    : 12
  const codingBoost = codingResponse.trim().length > 40 ? 8 : 0
  return Math.min(95, 30 + lengthScore + structureBoost + confidenceBoost + codingBoost)
}

export function buildDemoResponse(
  request: InterviewTurnRequest,
): InterviewTurnResponse {
  const mergedAnswer = combineAnswer(request)
  const score = estimateScore(mergedAnswer, request.coding_response)
  const focusTerms = extractFocusTerms(request.resume_text, request.jd_text)

  const baseQuestion =
    request.interview_mode === 'live-coding'
      ? codingQuestionByRole[request.role]
      : questionByRole[request.role]

  const tailoredQuestion = focusTerms.length
    ? `${baseQuestion} Keep your response grounded in ${focusTerms.join(', ')}.`
    : baseQuestion

  return {
    question: tailoredQuestion,
    score,
    feedback:
      score >= 75
        ? 'Strong ownership and reasoning. Tighten your answer by quantifying impact, validating edge cases, and naming one key tradeoff.'
        : 'Your intent is clear, but the response needs stronger structure. Use context, decision, implementation, and measurable result.',
    next_focus:
      request.interview_mode === 'live-coding'
        ? 'Practice coding while speaking your plan, complexity, and test strategy in under 2 minutes.'
        : 'Practice concise, metric-driven storytelling using a 3-part structure and one tradeoff.',
    mode: 'demo',
    latency_ms: 320,
  }
}

export async function requestInterviewTurn(
  request: InterviewTurnRequest,
  accessToken?: string,
): Promise<InterviewTurnResponse> {
  const mergedRequest: InterviewTurnRequest = {
    ...request,
    answer: combineAnswer(request),
  }

  if (isDemoModeEnabled) {
    return buildDemoResponse(mergedRequest)
  }

  if (!accessToken) {
    throw new Error('Authentication required. Please sign in again.')
  }

  const response = await fetch(interviewEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(mergedRequest),
  })

  if (!response.ok) {
    let errorMessage = 'Interview request failed'

    try {
      const errorPayload = (await response.json()) as { detail?: string }
      if (errorPayload.detail) {
        errorMessage = errorPayload.detail
      }
    } catch {
      const fallbackText = await response.text()
      if (fallbackText) {
        errorMessage = fallbackText
      }
    }

    throw new Error(errorMessage)
  }

  return (await response.json()) as InterviewTurnResponse
}

export function isUsingDemoMode(): boolean {
  return isDemoModeEnabled
}
