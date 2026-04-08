import { useMemo, useState } from 'react'
import {
  requestInterviewTurn,
  isUsingDemoMode,
  buildDemoResponse,
} from '../../services/interviewApi'
import {
  type InterviewTurnRequest,
  type InterviewTurnResponse,
  type InterviewTurnState,
} from './types'

const initialState: InterviewTurnState = {
  status: 'idle',
  result: null,
  errorMessage: null,
  infoMessage: null,
}

export function useInterviewTurn(accessToken: string | null) {
  const [state, setState] = useState<InterviewTurnState>(initialState)

  const runTurn = async (
    request: InterviewTurnRequest,
  ): Promise<InterviewTurnResponse> => {
    setState((previous) => ({
      ...previous,
      status: 'loading',
      errorMessage: null,
      infoMessage: null,
    }))

    try {
      const result = await requestInterviewTurn(request, accessToken ?? undefined)
      setState({
        status: 'success',
        result,
        errorMessage: null,
        infoMessage:
          result.mode === 'demo'
            ? 'Demo Mode is active. Connect backend to use live model responses.'
            : 'AI Mode is active through your interview backend.',
      })
      return result
    } catch (error) {
      if (isUsingDemoMode()) {
        const fallback = buildDemoResponse(request)
        setState({
          status: 'success',
          result: fallback,
          errorMessage: null,
          infoMessage:
            error instanceof Error
              ? `Backend unavailable (${error.message}). Showing Demo Mode output.`
              : 'Backend unavailable. Showing Demo Mode output.',
        })
        return fallback
      }

      setState({
        status: 'error',
        result: null,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Interview request failed. Please try again.',
        infoMessage: null,
      })
      throw error
    }
  }

  const modeLabel = useMemo(
    () => (isUsingDemoMode() ? 'Demo Mode' : 'AI Mode'),
    [],
  )

  return {
    state,
    modeLabel,
    runTurn,
  }
}
