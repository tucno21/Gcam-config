import { Link } from 'react-router-dom'
import { APP_NAME, CURRENT_STAGE, TOTAL_STAGES } from '../../lib/constants/app'
import { Brand } from './Brand'
import { NavLinks } from './NavLinks'

export const Sidebar = () => (
  <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line lg:flex">
    <div className="px-5 pt-6 pb-5">
      <Link to="/" aria-label={`${APP_NAME} · inicio`} className="inline-flex rounded-control">
        <Brand />
      </Link>
    </div>
    <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3">
      <NavLinks />
    </nav>
    <div className="border-t border-line px-5 py-4">
      <p className="ui-label">Etapa {String(CURRENT_STAGE).padStart(2, '0')} / {TOTAL_STAGES}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-disabled">En construcción por etapas</p>
    </div>
  </aside>
)
