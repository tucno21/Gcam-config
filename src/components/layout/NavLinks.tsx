import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/helpers/cn'
import { PRIMARY_NAV } from '../../lib/constants/navigation'

type NavLinksProps = {
  /** Se llama al activar un enlace: permite cerrar el menú móvil. */
  onNavigate?: () => void
}

export const NavLinks = ({ onNavigate }: NavLinksProps) => (
  <ul className="space-y-0.5">
    {PRIMARY_NAV.map((item) => {
      const Icon = item.icon
      return (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-2.5 rounded-control px-2.5 py-2 text-sm transition-colors duration-150',
                isActive
                  ? 'bg-white/[0.06] font-medium text-ink'
                  : 'text-ink-muted hover:bg-white/[0.03] hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                  />
                )}
                <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                {item.label}
              </>
            )}
          </NavLink>
        </li>
      )
    })}
  </ul>
)
