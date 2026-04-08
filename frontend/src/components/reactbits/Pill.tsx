import { clsx } from 'clsx'

interface PillProps {
  text: string
  tone?: 'neutral' | 'success' | 'warning'
}

export function Pill({ text, tone = 'neutral' }: PillProps) {
  return <span className={clsx('pill', `pill-${tone}`)}>{text}</span>
}
