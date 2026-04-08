import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import {
  type InterviewDifficulty,
  type InterviewRole,
  type InterviewTurnRequest,
} from './types'

interface InterviewFormProps {
  value: InterviewTurnRequest
  isLoading: boolean
  onChange: (nextValue: InterviewTurnRequest) => void
  onSubmit: () => void
}

const roles: Array<{ value: InterviewRole; label: string }> = [
  { value: 'frontend-engineer', label: 'Frontend Engineer' },
  { value: 'backend-engineer', label: 'Backend Engineer' },
  { value: 'fullstack-engineer', label: 'Fullstack Engineer' },
  { value: 'sde-intern', label: 'SDE Intern' },
]

const difficulties: Array<{ value: InterviewDifficulty; label: string }> = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

export function InterviewForm({
  value,
  isLoading,
  onChange,
  onSubmit,
}: InterviewFormProps) {
  return (
    <div className="form-grid">
      <label className="field">
        <span className="field-label">Role</span>
        <select
          value={value.role}
          onChange={(event) =>
            onChange({ ...value, role: event.target.value as InterviewRole })
          }
        >
          {roles.map((role) => (
            <option value={role.value} key={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Difficulty</span>
        <select
          value={value.difficulty}
          onChange={(event) =>
            onChange({
              ...value,
              difficulty: event.target.value as InterviewDifficulty,
            })
          }
        >
          {difficulties.map((difficulty) => (
            <option value={difficulty.value} key={difficulty.value}>
              {difficulty.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field field-full">
        <span className="field-label">Your Answer</span>
        <textarea
          value={value.answer}
          placeholder="Answer in 5-8 lines with one clear impact metric."
          onChange={(event) => onChange({ ...value, answer: event.target.value })}
          rows={7}
        />
      </label>

      <motion.button
        type="button"
        className="run-button"
        onClick={onSubmit}
        disabled={isLoading || value.answer.trim().length < 20}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
      >
        <Sparkles size={18} />
        {isLoading ? 'Running interview turn...' : 'Run interview turn'}
      </motion.button>
    </div>
  )
}
