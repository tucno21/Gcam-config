import { Aperture } from 'lucide-react'
import { APP_NAME, APP_SUBTITLE } from '../../lib/constants/app'

type BrandProps = { compact?: boolean }

export const Brand = ({ compact = false }: BrandProps) => (
  <div className="flex items-center gap-2.5">
    <span className="flex size-8 shrink-0 items-center justify-center rounded-control border border-accent/30 bg-accent/10 text-accent">
      <Aperture aria-hidden="true" className="size-4" strokeWidth={1.75} />
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-semibold tracking-tight text-ink">{APP_NAME}</span>
      {!compact && <span className="block text-[11px] leading-tight text-ink-faint">{APP_SUBTITLE}</span>}
    </span>
  </div>
)
