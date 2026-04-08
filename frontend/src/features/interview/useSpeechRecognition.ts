import { useMemo, useRef, useState } from 'react'

interface RecognitionAlternative {
  transcript: string
}

interface RecognitionResult {
  0: RecognitionAlternative
  isFinal: boolean
}

interface RecognitionResultList {
  length: number
  [index: number]: RecognitionResult
}

interface RecognitionEventLike {
  resultIndex: number
  results: RecognitionResultList
}

interface BrowserSpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

interface WindowWithSpeech extends Window {
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  SpeechRecognition?: new () => BrowserSpeechRecognition
}

export function useSpeechRecognition(onFinalChunk: (chunk: string) => void) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const shouldKeepListeningRef = useRef(false)
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const recognitionCtor = useMemo(() => {
    const speechWindow = window as WindowWithSpeech
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
  }, [])

  const isSupported = Boolean(recognitionCtor)

  const startListening = () => {
    if (!recognitionCtor) {
      setErrorMessage('Speech recognition is not supported in this browser.')
      return
    }

    if (!recognitionRef.current) {
      const recognition = new recognitionCtor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let finalChunk = ''
        let interimChunk = ''

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          if (!result?.[0]?.transcript) {
            continue
          }

          if (result.isFinal) {
            finalChunk += `${result[0].transcript.trim()} `
          } else {
            interimChunk += `${result[0].transcript.trim()} `
          }
        }

        setInterimTranscript(interimChunk.trim())
        if (finalChunk.trim()) {
          onFinalChunk(finalChunk.trim())
        }
      }

      recognition.onerror = (event) => {
        setErrorMessage(event.error ?? 'Voice capture failed.')
        setIsListening(false)
      }

      recognition.onend = () => {
        if (shouldKeepListeningRef.current) {
          // Some browsers auto-stop recognition; restart to keep realtime loop active.
          try {
            recognition.start()
            setIsListening(true)
            return
          } catch {
            // Ignore restart errors and fall through to idle state.
          }
        }

        setIsListening(false)
        setInterimTranscript('')
      }

      recognitionRef.current = recognition
    }

    setErrorMessage(null)
    shouldKeepListeningRef.current = true
    recognitionRef.current.start()
    setIsListening(true)
  }

  const stopListening = () => {
    shouldKeepListeningRef.current = false
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  return {
    isSupported,
    isListening,
    interimTranscript,
    errorMessage,
    startListening,
    stopListening,
  }
}
