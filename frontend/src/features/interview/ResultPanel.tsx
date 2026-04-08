import { motion } from 'framer-motion'
import { MessageSquareQuote, Radar, Target } from 'lucide-react'
import { GlassPanel } from '../../components/reactbits/GlassPanel'
import { MetricTile } from '../../components/reactbits/MetricTile'
import { Pill } from '../../components/reactbits/Pill'
import { fadeUp, popIn } from '../../lib/motion'
import { type InterviewTurnState } from './types'

interface ResultPanelProps {
  state: InterviewTurnState
  modeLabel: string
}

export function ResultPanel({ state, modeLabel }: ResultPanelProps) {
  if (state.status === 'idle') {
    return (
      <GlassPanel className="result-empty">
        <p>Submit your answer to receive question quality signals and coaching.</p>
      </GlassPanel>
    )
  }

  if (state.status === 'loading') {
    return (
      <GlassPanel className="result-empty">
        <p className="shimmer">Analyzing your answer with agent workflow...</p>
      </GlassPanel>
    )
  }

  if (state.status === 'error') {
    return (
      <GlassPanel className="result-empty">
        <p>{state.errorMessage ?? 'Unexpected error.'}</p>
      </GlassPanel>
    )
  }

  if (!state.result) {
    return null
  }

  return (
    <motion.div
      className="result-stack"
      variants={popIn}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.25 }}
    >
      <GlassPanel>
        <div className="result-head">
          <h3>Interview Output</h3>
          <Pill
            text={`${modeLabel} / ${state.result.latency_ms} ms`}
            tone={state.result.mode === 'local-ai' ? 'success' : 'warning'}
          />
        </div>
        <p className="result-question">
          <MessageSquareQuote size={18} /> {state.result.question}
        </p>
      </GlassPanel>

      <motion.div
        className="metrics-grid"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3 }}
      >
        <MetricTile label="Score" value={`${state.result.score}/100`} hint="Evaluator" />
        <MetricTile
          label="Feedback"
          value={state.result.feedback}
          hint="Coach"
        />
        <MetricTile
          label="Next Focus"
          value={state.result.next_focus}
          hint="Follow-up"
        />
      </motion.div>

      <GlassPanel className="insights">
        <p>
          <Radar size={17} /> <strong>Quality signal:</strong> prioritize structure,
          impact metrics, and tradeoffs.
        </p>
        <p>
          <Target size={17} /> <strong>Execution hint:</strong> keep answers under 90
          seconds and lead with the decision.
        </p>
      </GlassPanel>
    </motion.div>
  )
}
