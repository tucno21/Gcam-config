import type { ReactNode } from 'react'
import { cn } from '../../lib/helpers/cn'

type FormFieldProps = {
  /** Debe coincidir con el `id` del control para asociar la etiqueta. */
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}

/**
 * Etiqueta + control + mensaje. El control debe recibir
 * `aria-describedby={`${id}-hint` | `${id}-error`}` según corresponda.
 */
export const FormField = ({ id, label, hint, error, required, children, className }: FormFieldProps) => (
  <div className={cn('space-y-1.5', className)}>
    <label htmlFor={id} className="block text-[13px] font-medium text-ink">
      {label}
      {required && (
        <span aria-hidden="true" className="ml-1 text-accent">
          *
        </span>
      )}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} className="text-xs leading-relaxed text-danger">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="text-xs leading-relaxed text-ink-faint">
        {hint}
      </p>
    ) : null}
  </div>
)
