import { Link } from 'react-router-dom'
import { APP_NAME, CURRENT_STAGE, TOTAL_STAGES } from '../../lib/constants/app'
import { Brand } from './Brand'
import { NavLinks } from './NavLinks'

type SidebarProps = {
  userEmail: string | null
  onSignOut: () => void
}

export const Sidebar = ({ userEmail, onSignOut }: SidebarProps) => (
  <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line lg:flex">
    <div className="px-5 pt-6 pb-5">
      <Link to="/" aria-label={`${APP_NAME} · inicio`} className="inline-flex rounded-control">
        <Brand />
      </Link>
    </div>
    <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3">
      <NavLinks />
    </nav>
    <div className="space-y-4 border-t border-line px-5 py-4">
      <div>
        <p className="ui-label">Sesión</p>
        <p className="mt-1.5 truncate text-[11px] leading-relaxed text-ink-muted" title={userEmail ?? undefined}>
          {userEmail ?? 'Sin sesión'}
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-2 rounded-control text-xs text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Cerrar sesión
        </button>
      </div>
      <div>
        <p className="ui-label">
          Etapa {String(CURRENT_STAGE).padStart(2, '0')} / {TOTAL_STAGES}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-disabled">En construcción por etapas</p>
      </div>
    </div>
  </aside>
)
