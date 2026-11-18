import type { ReactNode } from 'react'
import { usePageTitle } from '../../hooks/usePageTitle'
import { Breadcrumbs } from './Breadcrumbs'
import type { Crumb } from './Breadcrumbs'

type PageHeaderProps = {
  title: string
  description?: string
  breadcrumbs?: Crumb[]
  actions?: ReactNode
}

/** Encabezado único por vista: ruta, título, contexto y acciones principales. */
export const PageHeader = ({ title, description, breadcrumbs, actions }: PageHeaderProps) => {
  usePageTitle(title)

  return (
    <header className="mb-7 flex flex-col gap-5 sm:mb-9 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-3">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.015em] text-balance text-ink sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted text-pretty">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
