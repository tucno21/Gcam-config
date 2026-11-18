import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export type Crumb = {
  label: string
  to?: string
}

type BreadcrumbsProps = {
  items: Crumb[]
}

export const Breadcrumbs = ({ items }: BreadcrumbsProps) => (
  <nav aria-label="Ruta de navegación">
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-ink-faint">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight aria-hidden="true" className="size-3 shrink-0 text-ink-disabled" />}
            {item.to && !isLast ? (
              <Link to={item.to} className="rounded-sm transition-colors duration-150 hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? 'page' : undefined} className={isLast ? 'text-ink-muted' : undefined}>
                {item.label}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  </nav>
)
