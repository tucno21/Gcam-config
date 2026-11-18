import type { ReactNode } from 'react'
import { cn } from '../../lib/helpers/cn'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'border-line-strong text-ink-muted',
  accent: 'border-accent/35 bg-accent/10 text-accent',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
}

type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

export const Badge = ({ children, tone = 'neutral', className }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-[4px] border px-1.5 py-1 font-mono text-[10px] leading-none tracking-[0.08em] uppercase',
      TONE_CLASS[tone],
      className,
    )}
  >
    {children}
  </span>
)
