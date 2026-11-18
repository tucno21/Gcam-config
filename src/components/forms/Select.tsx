import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/helpers/cn'
import { controlBase, controlBorder } from './controlStyles'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }

export const Select = ({ invalid = false, className, children, ...rest }: SelectProps) => (
  <select
    aria-invalid={invalid || undefined}
    className={cn(controlBase, controlBorder(invalid), 'h-10 pr-8', className)}
    {...rest}
  >
    {children}
  </select>
)
