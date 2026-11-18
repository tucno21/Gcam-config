import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/helpers/cn'
import { controlBase, controlBorder } from './controlStyles'

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }

export const Input = ({ invalid = false, className, ...rest }: InputProps) => (
  <input
    aria-invalid={invalid || undefined}
    className={cn(controlBase, controlBorder(invalid), 'h-10', className)}
    {...rest}
  />
)
