import { Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../../lib/constants/app'
import { IconButton } from '../common/IconButton'
import { Brand } from './Brand'

type MobileTopbarProps = {
  onOpenMenu: () => void
}

export const MobileTopbar = ({ onOpenMenu }: MobileTopbarProps) => (
  <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-line bg-canvas/90 px-2 py-2 backdrop-blur lg:hidden">
    <IconButton label="Abrir menú" onClick={onOpenMenu}>
      <Menu className="size-4" />
    </IconButton>
    <Link to="/" aria-label={`${APP_NAME} · inicio`} className="ml-1 inline-flex rounded-control">
      <Brand />
    </Link>
  </header>
)
