import { Link, useNavigate } from 'react-router-dom'
import { Archive, ArchiveRestore, Copy, History, Pencil, Trash2 } from 'lucide-react'
import { ActionMenu } from '../../../components/common/ActionMenu'
import { Badge } from '../../../components/common/Badge'
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

/** Fila de un ajuste: nombre, valor actual editable y acciones en un menú. */
export const ParameterRow = ({
  parameter,
  to,
  onValue,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: ParameterRowProps) => {
  const navigate = useNavigate()

  return (
    <li
      className={cn(
        'flex items-start gap-1 border-b border-line py-2.5 pr-1.5 pl-3 last:border-b-0',
        !parameter.isActive && 'opacity-60',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            to={to}
            className="min-w-0 truncate text-[13px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:text-accent"
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

      <ActionMenu
        label={`Acciones de ${parameter.name}`}
        items={[
          { key: 'open', label: 'Ver ficha e historial', icon: History, onSelect: () => navigate(to) },
          { key: 'edit', label: 'Editar parámetro', icon: Pencil, onSelect: onEdit },
          { key: 'duplicate', label: 'Duplicar parámetro', icon: Copy, onSelect: onDuplicate },
          {
            key: 'toggle',
            label: parameter.isActive ? 'Retirar parámetro' : 'Reactivar parámetro',
            icon: parameter.isActive ? Archive : ArchiveRestore,
            onSelect: onToggleActive,
          },
          { key: 'delete', label: 'Eliminar parámetro', icon: Trash2, onSelect: onDelete, tone: 'danger' },
        ]}
      />
    </li>
  )
}
