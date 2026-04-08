import { useEffect, useMemo, useRef, useState, useCallback, type ChangeEvent, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Code2, Play, Sparkles, BrainCircuit, LogOut, SendHorizontal, ShieldAlert, Upload, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useInterviewTurn } from '../features/interview/useInterviewTurn'
import { useSpeechRecognition } from '../features/interview/useSpeechRecognition'
import {
  type InterviewDifficulty,
  type InterviewMode,
  type InterviewRole,
  type InterviewTurnRequest,
} from '../features/interview/types'
import { useNavigate } from 'react-router-dom'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

type InterviewStage = 'intro' | 'resume' | 'dsa'

interface ConversationMessage {
  id: string
  speaker: 'interviewer' | 'interviewee'
  stage: InterviewStage
  text: string
  timestamp: string
  score?: number
}

interface StoredWorkspaceSession {
  conversation: ConversationMessage[]
  stage: InterviewStage
  codingDraft: string
  hasSessionStarted: boolean
}

const WORKSPACE_SESSION_STORAGE_KEY = 'hireme.workspace.session.v1'
const DEFAULT_CODING_DRAFT = 'package main\n\n// Architecture block pending...\n\n'

const ROLE_LABELS: Record<InterviewRole, string> = {
  'frontend-engineer': 'Frontend Engineer',
  'backend-engineer': 'Backend Engineer',
  'fullstack-engineer': 'Fullstack Engineer',
  'sde-intern': 'SDE Intern',
}

const MODE_LABELS: Record<InterviewMode, string> = {
  'behavioral': 'Behavioral',
  'live-coding': 'Live Coding',
  'system-design': 'System Design',
}

function inferInterviewProfile(resumeText: string): {
  role: InterviewRole
  interview_mode: InterviewMode
  difficulty: InterviewDifficulty
} {
  const normalized = resumeText.toLowerCase()

  const frontendHits = ['react', 'frontend', 'ui', 'css', 'typescript', 'next.js'].filter((term) => normalized.includes(term)).length
  const backendHits = ['backend', 'node', 'python', 'java', 'api', 'microservice', 'sql', 'database'].filter((term) => normalized.includes(term)).length

  let role: InterviewRole = 'fullstack-engineer'
  if (normalized.includes('intern') || normalized.includes('student') || normalized.includes('fresher')) {
    role = 'sde-intern'
  } else if (frontendHits > 0 && backendHits === 0) {
    role = 'frontend-engineer'
  } else if (backendHits > 0 && frontendHits === 0) {
    role = 'backend-engineer'
  }

  let interview_mode: InterviewMode = 'behavioral'
  if (
    normalized.includes('system design') ||
    normalized.includes('distributed') ||
    normalized.includes('scalability') ||
    normalized.includes('architecture')
  ) {
    interview_mode = 'system-design'
  } else if (
    normalized.includes('dsa') ||
    normalized.includes('algorithm') ||
    normalized.includes('competitive programming') ||
    normalized.includes('leetcode')
  ) {
    interview_mode = 'live-coding'
  }

  const yearMatches = [...normalized.matchAll(/(\d+)\+?\s+years?/g)]
  const maxYears = yearMatches.reduce((max, match) => Math.max(max, Number.parseInt(match[1], 10) || 0), 0)

  let difficulty: InterviewDifficulty = 'medium'
  if (maxYears >= 5 || normalized.includes('senior') || normalized.includes('staff') || normalized.includes('lead')) {
    difficulty = 'hard'
  } else if (role === 'sde-intern' || maxYears <= 1) {
    difficulty = 'easy'
  }

  return { role, interview_mode, difficulty }
}

function asksForFeedback(text: string): boolean {
  return /(feedback|score|evaluation|evaluate|review my answer|how did i do|what about my answer)/i.test(text)
}

function asksForCodingRound(text: string): boolean {
  return /(dsa|live coding|coding question|algorithm|data structure|linked list|tree|graph|dynamic programming|dp|leetcode)/i.test(text)
}

function resolveNextStage(
  currentStage: InterviewStage,
  candidateText: string,
  nextFocus: string,
  question: string,
  resumeResponsesCount: number,
): InterviewStage {
  const merged = `${nextFocus} ${question}`.toLowerCase()
  const modelSuggestsCoding = /live[-\s]?coding|dsa|algorithm|linked list|complexity|code|implement/.test(merged)
  const candidateAskedCoding = asksForCodingRound(candidateText)

  if (currentStage === 'intro') {
    return 'resume'
  }

  if (currentStage === 'resume') {
    if (candidateAskedCoding && resumeResponsesCount >= 1) {
      return 'dsa'
    }

    if (modelSuggestsCoding && resumeResponsesCount >= 2) {
      return 'dsa'
    }

    return 'resume'
  }

  return 'dsa'
}

function looksLikeCode(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  return (
    /class\s+\w+|function\s+\w+|const\s+\w+|let\s+\w+|=>|\{\s*$|\breturn\b|console\.log\(/m.test(trimmed) ||
    trimmed.split('\n').length >= 4
  )
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  ;(pdfjs as any).GlobalWorkerOptions.workerSrc = pdfWorkerSrc
  const rawData = new Uint8Array(await file.arrayBuffer())
  const loadingTask = (pdfjs as any).getDocument({ data: rawData })
  const pdf = await loadingTask.promise

  const pageTexts: string[] = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = (textContent.items as Array<{ str?: string }>)
      .map((item) => item.str ?? '')
      .join(' ')
    pageTexts.push(pageText)
  }

  return pageTexts.join(' ').replace(/\s+/g, ' ').trim()
}

function isValidStage(stage: unknown): stage is InterviewStage {
  return stage === 'intro' || stage === 'resume' || stage === 'dsa'
}

function loadStoredWorkspaceSession(): StoredWorkspaceSession | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(WORKSPACE_SESSION_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<StoredWorkspaceSession>
    if (!Array.isArray(parsed.conversation)) return null

    return {
      conversation: parsed.conversation,
      stage: isValidStage(parsed.stage) ? parsed.stage : 'intro',
      codingDraft: typeof parsed.codingDraft === 'string' ? parsed.codingDraft : DEFAULT_CODING_DRAFT,
      hasSessionStarted: Boolean(parsed.hasSessionStarted ?? parsed.conversation.length > 0),
    }
  } catch {
    return null
  }
}

const initialRequest: InterviewTurnRequest = {
  role: 'fullstack-engineer',
  difficulty: 'medium',
  interview_mode: 'behavioral',
  resume_text: '',
  jd_text: '',
  spoken_response: '',
  coding_response: '',
  answer: '',
}

export function WorkspacePage() {
  const { token, status } = useAuth()
  const navigate = useNavigate()
  const initialSession = useMemo(() => loadStoredWorkspaceSession(), [])
  
  const [request, setRequest] = useState<InterviewTurnRequest>(initialRequest)
  const [conversation, setConversation] = useState<ConversationMessage[]>(() => initialSession?.conversation ?? [])
  const [stage, setStage] = useState<InterviewStage>(() => initialSession?.stage ?? 'intro')
  const [hasSessionStarted, setHasSessionStarted] = useState<boolean>(() => initialSession?.hasSessionStarted ?? false)
  const [candidateDraft, setCandidateDraft] = useState('')
  const [typedMessage, setTypedMessage] = useState('')
  const [codingDraft, setCodingDraft] = useState(() => initialSession?.codingDraft ?? DEFAULT_CODING_DRAFT)
  const [audioEnabled] = useState(true)
  const [aiIsSpeaking, setAiIsSpeaking] = useState(false)
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [isParsingResume, setIsParsingResume] = useState(false)
  const [resumeFileName, setResumeFileName] = useState('')
  const [resumeError, setResumeError] = useState('')

  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const resumeFileInputRef = useRef<HTMLInputElement>(null)
  
  const { state: turnState, runTurn } = useInterviewTurn(token || '')

  const {
    isSupported,
    isListening,
    interimTranscript,
    startListening,
    stopListening,
  } = useSpeechRecognition((chunk) => {
    setCandidateDraft((prev) => (prev ? prev + ' ' : '') + chunk)
  })

  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (status === 'signed-out') navigate('/login')
  }, [status, navigate])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!hasSessionStarted && conversation.length === 0) {
      window.sessionStorage.removeItem(WORKSPACE_SESSION_STORAGE_KEY)
      return
    }

    const payload: StoredWorkspaceSession = {
      conversation,
      stage,
      codingDraft,
      hasSessionStarted,
    }

    window.sessionStorage.setItem(WORKSPACE_SESSION_STORAGE_KEY, JSON.stringify(payload))
  }, [conversation, stage, codingDraft, hasSessionStarted])

  const latestInterviewerMessage = useMemo(() => {
    return [...conversation].reverse().find((m) => m.speaker === 'interviewer') || null
  }, [conversation])

  const interviewerTurns = useMemo(() => conversation.filter((item) => item.speaker === 'interviewer'), [conversation])
  const candidateTurns = useMemo(() => conversation.filter((item) => item.speaker === 'interviewee'), [conversation])
  const scoredTurns = useMemo(() => interviewerTurns.filter((item) => typeof item.score === 'number'), [interviewerTurns])

  const latestScore = scoredTurns.length > 0 ? scoredTurns[scoredTurns.length - 1].score ?? null : null
  const averageScore =
    scoredTurns.length > 0
      ? Math.round(scoredTurns.reduce((acc, item) => acc + (item.score ?? 0), 0) / scoredTurns.length)
      : null

  const liveText = (candidateDraft + (interimTranscript ? ' ' + interimTranscript : '')).trimStart()
  const isEvaluating = turnState.status === 'loading'

  // Auto-scroll chat gracefully without layout thrashing
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [conversation, liveText, latestInterviewerMessage])

  const speakInterviewerQuestion = useCallback((question: string) => {
    if (audioEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(question)
      utterance.rate = 1.05
      utterance.pitch = 1
      
      setAiIsSpeaking(true)

      utterance.onend = () => {
         setAiIsSpeaking(false)
         setTimeout(() => startListening(), 300)
      }
      
      synthRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }
  }, [audioEnabled, startListening])

  const handleResumeFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setResumeError('Please upload a PDF resume file.')
      event.target.value = ''
      return
    }

    setResumeError('')
    setResumeFileName(file.name)
    setIsParsingResume(true)

    try {
      const parsedText = await extractTextFromPdf(file)
      if (parsedText.length < 80) {
        throw new Error('Could not extract enough text from this PDF. Please upload a text-based resume PDF.')
      }

      const inferredProfile = inferInterviewProfile(parsedText)
      setRequest((prev) => ({
        ...prev,
        resume_text: parsedText,
        role: inferredProfile.role,
        interview_mode: inferredProfile.interview_mode,
        difficulty: inferredProfile.difficulty,
      }))
    } catch (error) {
      setResumeFileName('')
      setResumeError(
        error instanceof Error
          ? error.message
          : 'Unable to parse this PDF. Please try another resume file.',
      )
    } finally {
      setIsParsingResume(false)
      event.target.value = ''
    }
  }, [])

  const handleUploadResumeClick = () => {
    resumeFileInputRef.current?.click()
  }

  const handleEvaluateTurn = useCallback(async (overrideText?: string) => {
    if (isSubmittingTurn || turnState.status === 'loading') return

    if (isListening) stopListening()
    const finalDraft = (overrideText ?? liveText).trim()
    if (!finalDraft) return

    setIsSubmittingTurn(true)
    setHasSessionStarted(true)

    const candidateMsg: ConversationMessage = {
      id: crypto.randomUUID(),
      speaker: 'interviewee',
      stage,
      text: finalDraft,
      timestamp: new Date().toISOString(),
    }
    
    setConversation(prev => [...prev, candidateMsg])
    setCandidateDraft('')
    setTypedMessage('')

    const pastedCode = looksLikeCode(finalDraft) ? finalDraft : ''
    const effectiveCodingResponse =
      stage === 'dsa'
        ? (pastedCode || codingDraft)
        : pastedCode

    const resumeResponsesCount =
      candidateTurns.filter((turn) => turn.stage === 'resume').length +
      (stage === 'resume' ? 1 : 0)

    const payload: InterviewTurnRequest = {
      ...request,
      interview_mode: stage === 'dsa' ? 'live-coding' : request.interview_mode,
      spoken_response: finalDraft,
      coding_response: effectiveCodingResponse,
      answer: 'Context: Next turn. Candidate said: ' + finalDraft,
    }

    let result
    try {
      result = await runTurn(payload)
    } catch {
      setIsSubmittingTurn(false)
      return
    }

    const includeFeedback = asksForFeedback(finalDraft)
    const interviewerText = includeFeedback
      ? `Feedback on your previous answer (Score: ${result.score}/100): ${result.feedback}\n\nNext question: ${result.question}`
      : result.question

    const AImsg: ConversationMessage = {
      id: crypto.randomUUID(),
      speaker: 'interviewer',
      stage,
      text: interviewerText,
      timestamp: new Date().toISOString(),
      score: result.score,
    }

    speakInterviewerQuestion(interviewerText)
    setConversation(prev => [...prev, AImsg])
    setStage((current) =>
      resolveNextStage(current, finalDraft, result.next_focus, result.question, resumeResponsesCount),
    )
    setIsSubmittingTurn(false)
  }, [
    isSubmittingTurn, turnState.status, isListening, stopListening, liveText, stage, request, codingDraft, runTurn, speakInterviewerQuestion, candidateTurns,
  ])

  useEffect(() => {
    if (isListening && liveText.trim().length > 3) {
      if (silenceTimer.current) clearTimeout(silenceTimer.current)
      silenceTimer.current = setTimeout(() => {
        handleEvaluateTurn()
      }, 3500)
    }
    return () => { if (silenceTimer.current) clearTimeout(silenceTimer.current) }
  }, [liveText, isListening, handleEvaluateTurn])

  useEffect(() => {
    if (!isListening && !aiIsSpeaking && !isEvaluating && !isSubmittingTurn && liveText.trim().length > 3) {
      const timer = setTimeout(() => { void handleEvaluateTurn() }, 600)
      return () => clearTimeout(timer)
    }
  }, [isListening, aiIsSpeaking, isEvaluating, isSubmittingTurn, liveText, handleEvaluateTurn])

  const handleBegin = async () => {
    if (isParsingResume) return
    if (isSubmittingTurn || turnState.status === 'loading') return

    if (!request.resume_text.trim()) {
      setResumeError('Upload your resume PDF before starting the interview.')
      return
    }

    const roleLabel = ROLE_LABELS[request.role]
    setIsSubmittingTurn(true)

    const openingPayload: InterviewTurnRequest = {
      ...request,
      interview_mode: 'behavioral',
      spoken_response: '',
      coding_response: '',
      answer:
        `Start the interview for a ${roleLabel} candidate. Ask the first contextual question ` +
        'based on resume and role. Keep it concise, conversational, and focused on intro/background.',
    }

    try {
      const result = await runTurn(openingPayload)
      const openingQuestion =
        result.question?.trim() ||
        `I reviewed your resume for a ${roleLabel} profile. Tell me about a project you are most proud of and why.`

      speakInterviewerQuestion(openingQuestion)
      setHasSessionStarted(true)
      setStage('intro')
      setConversation([
        {
          id: '1',
          speaker: 'interviewer',
          stage: 'intro',
          text: openingQuestion,
          timestamp: new Date().toISOString(),
          score: result.score,
        },
      ])
    } catch {
      const fallbackQuestion =
        `I reviewed your resume for a ${roleLabel} profile. Tell me about a project you are most proud of and why.`
      speakInterviewerQuestion(fallbackQuestion)
      setHasSessionStarted(true)
      setStage('intro')
      setConversation([
        {
          id: '1',
          speaker: 'interviewer',
          stage: 'intro',
          text: fallbackQuestion,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsSubmittingTurn(false)
    }
  }

  const handleTypedSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void handleEvaluateTurn(typedMessage)
  }

  const handleRequestLeave = () => setShowLeaveDialog(true)
  const handleCancelLeave = () => setShowLeaveDialog(false)
  const handleBackNavigation = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/')
  }

  const handleConfirmLeave = () => {
    if (isListening) stopListening()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(WORKSPACE_SESSION_STORAGE_KEY)
    }
    setConversation([])
    setHasSessionStarted(false)
    setStage('intro')
    setCandidateDraft('')
    setTypedMessage('')
    setShowLeaveDialog(false)
    navigate('/')
  }

  if (status === 'checking') return (
    <div className="flex items-center justify-center h-screen bg-[#050505] text-zinc-500 text-xs font-bold tracking-[0.3em] uppercase">
      Provisioning Architecture...
    </div>
  )

  const isDSA = stage === 'dsa'
  const aiStatusLabel = isEvaluating ? "Processing Stream" : aiIsSpeaking ? "Synthesizing" : isListening ? "Capturing Matrix" : "Awaiting Uplink"
  const isDemoModeActive = turnState.result?.mode === 'demo'
  
  const skillTags = request.role.split('-').map(r => r.toUpperCase())

  // We map the numeric representation dynamically based on the string stage to look "engineered"
  const stageMap = { intro: 1, resume: 2, dsa: 3 }
  const currentStageNum = stageMap[stage]

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col overflow-hidden text-zinc-200 font-sans antialiased 
      selection:bg-white/20 selection:text-white">
      
      {/* Delicate Grid Background Layer (like Luvara) */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize: '4rem 4rem'
      }} />

      <header className="h-16 shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#050505]/70 backdrop-blur-xl z-20">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] transition"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt=""
              aria-hidden
              className="h-7 w-7 rounded-lg object-contain shadow-[0_0_14px_rgba(255,255,255,0.22)]"
            />
            <span className="font-medium tracking-tight text-sm text-zinc-100">Hireme.ai</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Engine</span>
            <span className="text-[10px] font-bold text-zinc-200 uppercase tracking-[0.2em]">
              {stage === 'intro' ? 'Phase 01: Core' : stage === 'resume' ? 'Phase 02: Systems' : 'Phase 03: Architecture'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.02] border border-white/5">
            {[1, 2, 3].map((num) => (
              <div 
                key={num} 
                className={`w-10 h-7 flex items-center justify-center text-[10px] font-black tracking-widest rounded-lg transition-colors duration-500 ${currentStageNum === num ? 'bg-zinc-200 text-zinc-950 shadow-sm' : 'text-zinc-500'}`}
              >
                0{num}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleRequestLeave}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-200 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Leave Interview
          </button>
        </div>
      </header>

      {turnState.infoMessage && (
        <div
          className={`z-20 shrink-0 px-6 py-2 text-[10px] font-bold uppercase tracking-[0.16em] border-b ${
            isDemoModeActive
              ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          {turnState.infoMessage}
        </div>
      )}

      {!hasSessionStarted ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#050505] to-[#050505]">
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="flex flex-col items-center w-full max-w-2xl">
             <div className="w-24 h-24 mb-10 border border-white/10 rounded-[1.5rem] flex items-center justify-center bg-white/[0.03] shadow-2xl shadow-white/[0.02]">
                <Sparkles className="w-8 h-8 text-zinc-300" />
             </div>
             <h2 className="text-4xl md:text-6xl font-black tracking-tightest uppercase italic mb-6 text-zinc-100 text-center">Establish <br/> Neural Uplink</h2>
             <p className="text-zinc-500 font-medium mb-12 text-center leading-relaxed">Provide your resume to initialize the autonomous evaluation loop. The cognitive engine will adapt its questioning based on your profile.</p>
             
             <div className="w-full space-y-6 mb-12 bg-white/[0.02] p-8 rounded-3xl border border-white/5 backdrop-blur-md">
                <input
                  ref={resumeFileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={handleResumeFileChange}
                />

                <button
                  type="button"
                  onClick={handleUploadResumeClick}
                  disabled={isParsingResume}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-left transition hover:border-white/25 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-3 text-zinc-200">
                    <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </span>
                    <span>
                      <span className="block text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Resume Upload</span>
                      <span className="block mt-1 text-sm font-semibold text-zinc-200">
                        {isParsingResume ? 'Parsing resume PDF...' : 'Upload Resume PDF'}
                      </span>
                    </span>
                  </span>
                </button>

                {resumeFileName && (
                  <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-xs text-zinc-300">
                    Loaded file: <span className="font-semibold text-zinc-100">{resumeFileName}</span>
                  </div>
                )}

                {request.resume_text.trim() && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3">
                      <p className="text-zinc-500 uppercase tracking-[0.14em] text-[10px]">Detected Role</p>
                      <p className="mt-1 font-semibold text-zinc-100">{ROLE_LABELS[request.role]}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3">
                      <p className="text-zinc-500 uppercase tracking-[0.14em] text-[10px]">Detected Mode</p>
                      <p className="mt-1 font-semibold text-zinc-100">{MODE_LABELS[request.interview_mode]}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3">
                      <p className="text-zinc-500 uppercase tracking-[0.14em] text-[10px]">Detected Difficulty</p>
                      <p className="mt-1 font-semibold text-zinc-100">{request.difficulty.toUpperCase()}</p>
                    </div>
                  </div>
                )}

                {resumeError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                    {resumeError}
                  </div>
                )}
             </div>

             <button 
               type="button"
               onClick={handleBegin} 
               disabled={isParsingResume || isSubmittingTurn || !request.resume_text.trim()}
               className="group px-10 py-5 bg-zinc-100 text-zinc-950 font-bold rounded-[1.2rem] uppercase text-[11px] tracking-[0.2em] hover:scale-[1.02] transition-all flex items-center gap-3 shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
             >
               {isSubmittingTurn ? 'Initializing...' : 'Initialize Stream'} <Play className="w-3.5 h-3.5 fill-black group-hover:translate-x-1 transition-transform" />
             </button>
           </motion.div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex overflow-hidden">
          
          {/* Left Pane: Intelligence & Telemetry */}
          <motion.div 
            initial={{ width: '50%' }}
            animate={{ width: isDSA ? '420px' : '50%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            className="border-r border-white/5 flex flex-col p-8 md:p-12 shrink-0 bg-[#0a0a0b]/80 backdrop-blur-3xl"
          >
            <div className="flex items-center gap-3 mb-10">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Live Telemetry</span>
            </div>

            {/* Structured chat block - locked height container prevents shuttering */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto mb-8 scroll-smooth pr-4 scrollbar-hide space-y-10">
              {conversation.map((msg) => (
                <div key={msg.id} className={`flex gap-5 ${msg.speaker === 'interviewee' ? 'flex-row-reverse' : ''}`}>
                   
                   {msg.speaker === 'interviewer' && (
                     <div className="w-10 h-10 rounded-[12px] bg-white/[0.04] border border-white/5 flex-shrink-0 flex items-center justify-center mt-1">
                       <Sparkles className="text-zinc-400 w-4 h-4" />
                     </div>
                   )}
                   
                   <div className={`space-y-2 max-w-[85%] ${msg.speaker === 'interviewee' ? 'text-right' : ''}`}>
                     <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block">
                       {msg.speaker === 'interviewer' ? 'System Output' : 'Candidate Response'}
                     </span>
                     <div className={`p-6 text-sm md:text-[15px] leading-relaxed font-medium rounded-[1.5rem] ${
                        msg.speaker === 'interviewer' 
                        ? 'bg-white/[0.03] border border-white/5 text-zinc-200 rounded-tl-none' 
                        : 'bg-zinc-200 text-zinc-950 rounded-tr-none'
                     }`}>
                       {msg.text}
                     </div>
                   </div>
                </div>
              ))}
            </div>

            <div className="h-[228px] shrink-0 border-t border-white/5 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.05]">
                    <Mic className={`h-4 w-4 ${isListening ? 'text-zinc-100' : 'text-zinc-600'}`} />
                    {(isListening || isEvaluating || aiIsSpeaking) && (
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={`absolute inset-0 rounded-[10px] border ${isEvaluating ? 'border-amber-500/50' : 'border-zinc-300'}`}
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Active Stream</span>
                    <span className={`text-[9px] font-mono font-bold ${isListening ? 'text-emerald-400/80' : 'text-zinc-500'}`}>
                      [{aiStatusLabel}]
                    </span>
                  </div>
                </div>

                <div className="flex h-6 items-end gap-1.5">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      style={{ transformOrigin: 'bottom' }}
                      animate={{ scaleY: isListening || aiIsSpeaking || isEvaluating ? [0.4, 1, 0.4] : 0.2 }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                      className={`h-full w-1 rounded-full ${isEvaluating ? 'bg-amber-500/50' : 'bg-zinc-400/50'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex h-12 w-full items-center overflow-hidden rounded-xl border border-white/5 bg-[#050505] px-4">
                <div className="w-full truncate text-[13px] text-zinc-300">
                  {liveText ? liveText : <span className="italic text-zinc-700">Listening for voice patterns...</span>}
                </div>
              </div>

              <form onSubmit={handleTypedSubmit} className="mt-4 flex items-center gap-3">
                <input
                  value={typedMessage}
                  onChange={(event) => setTypedMessage(event.target.value)}
                  placeholder="Type a response and press Enter"
                  className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-400/60"
                />
                <button
                  type="submit"
                  disabled={!typedMessage.trim() || isSubmittingTurn || isEvaluating}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send <SendHorizontal className="h-3.5 w-3.5" />
                </button>
              </form>

              <p className="mt-2 text-[10px] text-zinc-500">
                {isSupported ? 'Tip: you can switch between voice and typed responses at any time.' : 'Speech recognition is unavailable in this browser. Use typing to continue the interview.'}
              </p>
            </div>
          </motion.div>

          {/* Right Pane: Analysis & Deep IDE Contex */}
          <div className="flex-1 relative flex flex-col bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-zinc-900/20 via-[#050505] to-[#050505]">
            <AnimatePresence mode="wait">
              {stage !== 'dsa' ? (
                <motion.div 
                  key="analysis"
                  initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 overflow-y-auto p-8 md:p-10"
                >
                  <div className="mx-auto max-w-5xl space-y-6">
                    <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Interview Control Center</p>
                      <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-zinc-100 md:text-4xl">Session Intelligence Dashboard</h2>
                      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
                        A production-focused view of interview progress, score stability, and role-fit signals. Keep the dialogue natural while tracking objective performance indicators.
                      </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                      <div className="rounded-[1.6rem] border border-white/10 bg-[#0a0a0b] p-6 lg:col-span-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Session Overview</p>
                        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Stage</p>
                            <p className="mt-2 text-lg font-black uppercase text-zinc-100">{stage === 'intro' ? 'Introduction' : stage === 'resume' ? 'Resume Deep Dive' : 'Coding Round'}</p>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Questions Asked</p>
                            <p className="mt-2 text-lg font-black text-zinc-100">{interviewerTurns.length}</p>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Responses Captured</p>
                            <p className="mt-2 text-lg font-black text-zinc-100">{candidateTurns.length}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.6rem] border border-white/10 bg-[#0a0a0b] p-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Quality Signal</p>
                        <div className="mt-5 flex items-center gap-4">
                          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/[0.02]">
                            <BrainCircuit className={`h-7 w-7 ${isEvaluating ? 'text-amber-400' : 'text-zinc-300'}`} />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Latest Score</p>
                            <p className="mt-1 text-2xl font-black text-zinc-100">{latestScore ?? '--'}</p>
                          </div>
                        </div>
                        <p className="mt-5 text-xs text-zinc-400">Average confidence: {averageScore ?? '--'} / 100 across scored turns.</p>
                      </div>

                      <div className="rounded-[1.6rem] border border-white/10 bg-[#0a0a0b] p-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Role Focus</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {skillTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[1.6rem] border border-white/10 bg-[#0a0a0b] p-6 lg:col-span-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Interviewer Prompt Context</p>
                        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm leading-relaxed text-zinc-300">
                          {latestInterviewerMessage
                            ? latestInterviewerMessage.text
                            : 'The next interviewer prompt will appear here after the first turn is initiated.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="ide"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col bg-[#050505]"
                >
                  <div className="h-14 border-b border-white/5 flex items-center px-6 gap-6 bg-[#0a0a0b] shrink-0">
                    <div className="flex items-center gap-2 text-[11px] font-mono font-medium text-zinc-100 h-full border-b-2 border-white pt-0.5">
                      <Code2 className="w-3.5 h-3.5" /> architecture.go
                    </div>
                  </div>
                  
                  <textarea
                    className="flex-1 w-full bg-transparent p-10 font-mono text-[13px] leading-7 text-zinc-300 focus:outline-none resize-none selection:bg-white/10 selection:text-white"
                    value={codingDraft}
                    onChange={(e) => setCodingDraft(e.target.value)}
                    spellCheck={false}
                  />
                  
                  <div className="h-[140px] bg-[#020202] border-t border-white/5 p-8 font-mono text-[11px] text-zinc-500 shrink-0">
                     <div className="text-zinc-600 mb-2">$ engine run --analyze ./architecture.go</div>
                     <div className={isEvaluating ? "text-amber-500/80 animate-pulse" : "text-zinc-500"}>
                        {isEvaluating ? "> Generating AST and executing dry-run tests..." : "> Ready for agentic evaluation..."}
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}

      <AnimatePresence>
        {showLeaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 10, opacity: 0, scale: 0.98 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0b0c] p-6 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg border border-amber-400/20 bg-amber-500/10 p-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-zinc-100">Leave Interview Session?</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Leaving now exits the active interview room. Use this only if you are done or need to restart.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-300">
                <p className="mb-2 font-semibold text-zinc-200">Before you leave:</p>
                <p>1. Current conversation on this screen will be cleared.</p>
                <p>2. Any in-progress spoken response will be interrupted.</p>
                <p>3. You can start a new session anytime from the home page.</p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelLeave}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-300 hover:bg-white/10"
                >
                  Continue Interview
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLeave}
                  className="rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-rose-200 hover:bg-rose-500/25"
                >
                  Leave Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

