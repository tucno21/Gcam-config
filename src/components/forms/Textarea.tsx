import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/helpers/cn'
import { controlBase, controlBorder } from './controlStyles'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }

export const Textarea = ({ invalid = false, className, rows = 4, ...rest }: TextareaProps) => (
  <textarea
    rows={rows}
    aria-invalid={invalid || undefined}
    className={cn(controlBase, controlBorder(invalid), 'resize-y py-2 leading-relaxed', className)}
    {...rest}
  />
)
