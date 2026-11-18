import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/helpers/cn'
import { Tooltip } from './Tooltip'

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  /** Nombre accesible obligatorio: el botón solo muestra un icono. */
  label: string
  /** Texto corto del globo al pasar el ratón. Por defecto, el mismo `label`. */
  hint?: string
  /** Desactiva el globo cuando ya hay un menú u otra pista visual. */
  tooltip?: boolean
  tone?: 'ghost' | 'secondary' | 'danger'
  size?: 'sm' | 'md'
}

const TONE_CLASS = {
  ghost: 'text-ink-faint hover:bg-white/[0.05] hover:text-ink',
  secondary: 'border border-line-strong text-ink-muted hover:bg-surface-raised hover:text-ink',
  danger: 'text-ink-faint hover:bg-danger/10 hover:text-danger',
}

const SIZE_CLASS = {
  sm: 'size-8',
  md: 'size-10',
}

/** Botón de solo icono con nombre accesible y globo de ayuda. */
export const IconButton = ({
  label,
  hint,
  tooltip = true,
  tone = 'ghost',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: IconButtonProps) => {
  const button = (
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

  return tooltip ? <Tooltip label={hint ?? label}>{button}</Tooltip> : button
}
