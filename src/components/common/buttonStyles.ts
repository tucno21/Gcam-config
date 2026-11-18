import { cn } from '../../lib/helpers/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'xs' | 'sm' | 'md'

export const BUTTON_VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'border border-transparent bg-accent text-accent-ink hover:bg-accent-strong',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-raised',
  ghost: 'border border-transparent text-ink-muted hover:bg-white/[0.04] hover:text-ink',
  danger: 'border border-danger/35 bg-transparent text-danger hover:bg-danger/10',
}

export const BUTTON_SIZE_CLASS: Record<ButtonSize, string> = {
  xs: 'h-8 gap-1.5 px-2.5 text-xs',
  sm: 'h-9 gap-1.5 px-3 text-[13px]',
  md: 'h-10 gap-2 px-4 text-sm',
}

type ButtonClassNameOptions = {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/** Estilos compartidos por `Button` y `ButtonLink` para no duplicar variantes. */
export const buttonClassName = ({ variant = 'secondary', size = 'md', className }: ButtonClassNameOptions = {}): string =>
  cn(
    'inline-flex items-center justify-center rounded-control font-medium whitespace-nowrap',
    'transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-45',
    BUTTON_VARIANT_CLASS[variant],
    BUTTON_SIZE_CLASS[size],
    className,
  )
