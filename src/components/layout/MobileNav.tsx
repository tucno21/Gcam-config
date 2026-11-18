import { X } from 'lucide-react'
import { CURRENT_STAGE, TOTAL_STAGES } from '../../lib/constants/app'
import { Dialog } from '../common/Dialog'
import { IconButton } from '../common/IconButton'
import { Brand } from './Brand'
import { NavLinks } from './NavLinks'

type MobileNavProps = {
  open: boolean
  onClose: () => void
}

export const MobileNav = ({ open, onClose }: MobileNavProps) => (
  <Dialog open={open} onClose={onClose} title="Navegación" hideHeader placement="left">
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-5 py-4">
        <Brand />
        <IconButton label="Cerrar menú" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-2">
        <NavLinks onNavigate={onClose} />
      </nav>
      <div className="border-t border-line px-5 py-4">
        <p className="ui-label">
          Etapa {String(CURRENT_STAGE).padStart(2, '0')} / {TOTAL_STAGES}
        </p>
      </div>
    </div>
  </Dialog>
)
