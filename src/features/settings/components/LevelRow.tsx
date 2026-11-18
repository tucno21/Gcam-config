import { Link } from 'react-router-dom'
import { Archive, ArchiveRestore, ChevronRight, Copy, FolderTree, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '../../../components/common/Badge'
import { IconButton } from '../../../components/common/IconButton'
import { cn } from '../../../lib/helpers/cn'
import type { ParameterNode } from '../../../services/types'

type LevelRowProps = {
  node: ParameterNode
  to: string
  childCount: number
  parameterCount: number
  onEdit: () => void
  onDuplicate: () => void
  onToggleActive: () => void
  onDelete: () => void
}

/** Fila de un nivel dentro de la pantalla actual. */
export const LevelRow = ({
  node,
  to,
  childCount,
  parameterCount,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: LevelRowProps) => (
  <li className={cn('flex items-center gap-2 border-b border-line px-3 py-1.5 last:border-b-0', !node.isActive && 'opacity-60')}>
    <Link
      to={to}
      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-control px-1 py-1.5 transition-colors hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <FolderTree aria-hidden="true" className="size-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-ink">{node.name}</span>
          {!node.isActive && <Badge tone="warning">Retirado</Badge>}
        </span>
        <span className="mt-0.5 block text-[11px] text-ink-faint">
          {childCount === 0 ? 'Sin subniveles' : `${childCount} ${childCount === 1 ? 'subnivel' : 'subniveles'}`}
          {' · '}
          {parameterCount === 0 ? 'sin parámetros' : `${parameterCount} ${parameterCount === 1 ? 'parámetro' : 'parámetros'}`}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-disabled" />
    </Link>

    <div className="flex shrink-0 items-center gap-0.5">
      <IconButton size="sm" label={`Editar ${node.name}`} onClick={onEdit}>
        <Pencil aria-hidden="true" className="size-3.5" />
      </IconButton>
      <IconButton size="sm" label={`Duplicar ${node.name}`} onClick={onDuplicate}>
        <Copy aria-hidden="true" className="size-3.5" />
      </IconButton>
      <IconButton
        size="sm"
        label={node.isActive ? `Retirar ${node.name}` : `Reactivar ${node.name}`}
        onClick={onToggleActive}
      >
        {node.isActive ? <Archive aria-hidden="true" className="size-3.5" /> : <ArchiveRestore aria-hidden="true" className="size-3.5" />}
      </IconButton>
      <IconButton size="sm" label={`Eliminar ${node.name}`} onClick={onDelete}>
        <Trash2 aria-hidden="true" className="size-3.5" />
      </IconButton>
    </div>
  </li>
)
