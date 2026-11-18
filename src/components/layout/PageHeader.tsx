import type { ReactNode } from 'react'
import { usePageTitle } from '../../hooks/usePageTitle'
import { cn } from '../../lib/helpers/cn'
import { Breadcrumbs } from './Breadcrumbs'
import type { Crumb } from './Breadcrumbs'

type PageHeaderProps = {
  title: string
  description?: string
  breadcrumbs?: Crumb[]
  /** Ruta interna de la cámara, debajo de las migas principales. */
  trail?: Crumb[]
  actions?: ReactNode
  /** Título y acciones en la misma fila también en móvil. */
  actionsInline?: boolean
}

/** Encabezado único por vista: ruta, título, contexto y acciones principales. */
export const PageHeader = ({
  title,
  description,
  breadcrumbs,
  trail,
  actions,
  actionsInline = false,
}: PageHeaderProps) => {
  usePageTitle(title)

  return (
    <header
      className={cn(
        'mb-7 flex justify-between gap-4 sm:mb-9 sm:gap-8',
        actionsInline ? 'flex-row items-end' : 'flex-col sm:flex-row sm:items-end',
      )}
    >
      <div className="min-w-0 flex-1">
        {((breadcrumbs && breadcrumbs.length > 0) || (trail && trail.length > 0)) && (
          <div className="mb-3 space-y-1.5">
            {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
            {trail && trail.length > 0 && <Breadcrumbs items={trail} />}
          </div>
        )}
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.015em] text-balance text-ink sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted text-pretty">{description}</p>
        )}
      </div>
      {actions && <div className={cn('flex shrink-0 items-center gap-2', actionsInline ? 'flex-nowrap' : 'flex-wrap')}>{actions}</div>}
    </header>
  )
}
