import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface GlassPanelProps {
  children: ReactNode
  className?: string
}

export function GlassPanel({ children, className }: GlassPanelProps) {
  return <section className={clsx('glass-panel', className)}>{children}</section>
}
