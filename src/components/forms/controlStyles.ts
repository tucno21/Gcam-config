import { cn } from '../../lib/helpers/cn'

/** Base compartida por input, textarea y select: inset, un paso más oscuro. */
export const controlBase = cn(
  'w-full rounded-control border bg-surface-sunken px-3 text-sm text-ink',
  'transition-[border-color,background-color,color] duration-150',
  'placeholder:text-ink-disabled disabled:cursor-not-allowed disabled:opacity-50',
)

export const controlBorder = (invalid?: boolean): string =>
  invalid ? 'border-danger/60' : 'border-line-strong hover:border-white/20'
