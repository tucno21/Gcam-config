import { Link } from 'react-router-dom'
import { Archive, ArchiveRestore, Copy, History, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '../../../components/common/Badge'
import { IconButton } from '../../../components/common/IconButton'
import { cn } from '../../../lib/helpers/cn'
import type { Parameter } from '../../../services/types'
import { DATA_TYPE_LABEL, formatCurrentValueWithUnit, formatDefaultValue } from '../valueFormat'

type ParameterRowProps = {
  parameter: Parameter
  to: string
  onValue: () => void
  onEdit: () => void
  onDuplicate: () => void
  onToggleActive: () => void
  onDelete: () => void
}

/** Fila de un ajuste: nombre, valor actual editable y nota acumulada. */
export const ParameterRow = ({
  parameter,
  to,
  onValue,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: ParameterRowProps) => (
  <li
    className={cn(
      'flex flex-wrap items-start gap-2 border-b border-line px-3 py-2.5 last:border-b-0 sm:flex-nowrap',
      !parameter.isActive && 'opacity-60',
    )}
  >
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          to={to}
          className="truncate text-[13px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:text-accent"
        >
          {parameter.name}
        </Link>
        <Badge>{DATA_TYPE_LABEL[parameter.dataType]}</Badge>
        {parameter.currentValueSource !== 'custom' && (
          <Badge tone={parameter.currentValueSource === 'unknown' ? 'warning' : undefined}>
            {parameter.currentValueSource === 'default' ? 'De librería' : 'Sin valor'}
          </Badge>
        )}
        {!parameter.isActive && <Badge tone="warning">Retirado</Badge>}
      </div>

      <button
        type="button"
        onClick={onValue}
        className="mt-1 inline-flex items-center gap-2 rounded-control border border-line bg-surface-sunken px-2 py-1 text-left transition-colors hover:border-line-strong hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label={`Cambiar valor de ${parameter.name}`}
      >
        <span className="font-mono text-[12px] text-ink">{formatCurrentValueWithUnit(parameter)}</span>
        <span className="text-[10px] tracking-wide text-ink-faint uppercase">cambiar</span>
      </button>

      {parameter.notes ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-faint">{parameter.notes}</p>
      ) : (
        <p className="mt-1 text-[11px] text-ink-disabled">
          Predeterminado: {formatDefaultValue(parameter)} · sin nota
        </p>
      )}
    </div>

    <div className="flex shrink-0 items-center gap-0.5">
      <Link
        to={to}
        aria-label={`Ver historial de ${parameter.name}`}
        title="Ver historial"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-control text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <History aria-hidden="true" className="size-3.5" />
      </Link>
      <IconButton size="sm" label={`Editar ${parameter.name}`} onClick={onEdit}>
        <Pencil aria-hidden="true" className="size-3.5" />
      </IconButton>
      <IconButton size="sm" label={`Duplicar ${parameter.name}`} onClick={onDuplicate}>
        <Copy aria-hidden="true" className="size-3.5" />
      </IconButton>
      <IconButton
        size="sm"
        label={parameter.isActive ? `Retirar ${parameter.name}` : `Reactivar ${parameter.name}`}
        onClick={onToggleActive}
      >
        {parameter.isActive ? (
          <Archive aria-hidden="true" className="size-3.5" />
        ) : (
          <ArchiveRestore aria-hidden="true" className="size-3.5" />
        )}
      </IconButton>
      <IconButton size="sm" label={`Eliminar ${parameter.name}`} onClick={onDelete}>
        <Trash2 aria-hidden="true" className="size-3.5" />
      </IconButton>
    </div>
  </li>
)
