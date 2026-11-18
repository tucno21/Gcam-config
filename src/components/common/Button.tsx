import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { buttonClassName } from './buttonStyles'
import type { ButtonSize, ButtonVariant } from './buttonStyles'
import { Spinner } from '../feedback/Spinner'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leadingIcon?: ReactNode
}

export const Button = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  leadingIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={buttonClassName({ variant, size, className })}
    {...rest}
  >
    {loading ? <Spinner className="size-3.5" /> : leadingIcon}
    {children}
  </button>
)
