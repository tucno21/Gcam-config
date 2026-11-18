import { NavLink, useParams } from 'react-router-dom'
import { VERSION_TABS } from '../../../lib/constants/versionSections'
import { cn } from '../../../lib/helpers/cn'

export const VersionTabs = () => {
  const { cameraId, versionId } = useParams()
  const base = `/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}`

  return (
    <nav
      aria-label="Secciones de la versión"
      className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex min-w-max gap-1 border-b border-line">
        {VERSION_TABS.map((tab) => {
          const Icon = tab.icon
          const to = tab.key ? `${base}/${tab.key}` : base

          return (
            <li key={tab.key || 'resumen'}>
              <NavLink
                to={to}
                end={tab.key === ''}
                className={({ isActive }) =>
                  cn(
                    '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] whitespace-nowrap transition-colors duration-150',
                    isActive
                      ? 'border-accent font-medium text-ink'
                      : 'border-transparent text-ink-faint hover:border-line-strong hover:text-ink',
                  )
                }
              >
                <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                {tab.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
