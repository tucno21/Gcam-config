import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/helpers/cn'

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  /** Nombre accesible obligatorio: el botón solo muestra un icono. */
  label: string
  tone?: 'ghost' | 'secondary'
  size?: 'sm' | 'md'
}

const TONE_CLASS = {
  ghost: 'text-ink-faint hover:bg-white/[0.05] hover:text-ink',
  secondary: 'border border-line-strong text-ink-muted hover:bg-surface-raised hover:text-ink',
}

const SIZE_CLASS = {
  sm: 'size-8',
  md: 'size-10',
}

export const IconButton = ({
  label,
  tone = 'ghost',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: IconButtonProps) => (
  <button
    type={type}
    aria-label={label}
    className={cn(
      'inline-flex shrink-0 items-center justify-center rounded-control',
      'transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]',
      'disabled:pointer-events-none disabled:opacity-45',
      TONE_CLASS[tone],
      SIZE_CLASS[size],
      className,
    )}
    {...rest}
  >
    {children}
  </button>
)
