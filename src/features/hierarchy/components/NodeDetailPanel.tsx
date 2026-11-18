import { ChevronRight, Folder, FolderOpen, CornerDownRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { IconButton } from '../../../components/common/IconButton'
import { Button } from '../../../components/common/Button'
import { Panel } from '../../../components/common/Panel'
import { Badge } from '../../../components/common/Badge'
import { Spinner } from '../../../components/feedback/Spinner'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { parameterService } from '../../../services/parameterService'
import type { DataType, NodeType, ParameterNode } from '../../../services/types'
import type { TreeIndex } from '../treeUtils'
import { ancestorsOf, descendantCount } from '../treeUtils'

const TYPE_LABEL: Record<NodeType, string> = {
  category: 'Categoría',
  group: 'Grupo',
  subgroup: 'Subgrupo',
}

const TYPE_ICON: Record<NodeType, typeof Folder> = {
  category: Folder,
  group: FolderOpen,
  subgroup: CornerDownRight,
}

const DATA_TYPE_LABEL: Record<DataType, string> = {
  integer: 'Entero',
  decimal: 'Decimal',
  boolean: 'Sí/No',
  string: 'Texto',
  enum: 'Lista',
  json: 'JSON',
}

type NodeDetailPanelProps = {
  index: TreeIndex
  node: ParameterNode
  onAddChild: (node: ParameterNode) => void
  onEdit: (node: ParameterNode) => void
  onDelete: (node: ParameterNode) => void
}

/** Panel de detalle del nodo seleccionado: ruta, conteos, datos y parámetros. */
export const NodeDetailPanel = ({ index, node, onAddChild, onEdit, onDelete }: NodeDetailPanelProps) => {
  const ancestors = ancestorsOf(index, node.id)
  const children = index.childrenByParent.get(node.id) ?? []
  const depth = ancestors.length
  const descendants = descendantCount(index, node.id)
  const Icon = TYPE_ICON[node.nodeType] ?? Folder

  const parametersQuery = useAsyncData(
    () => parameterService.listByNode(node.id, { includeInactive: true }),
    `node-parameters|${node.id}`,
  )
  const parameters = parametersQuery.status === 'success' ? (parametersQuery.data ?? []) : []

  return (
    <Panel
      title="Detalle del nodo"
      description="La ruta se calcula desde las relaciones; nunca se guarda duplicada."
      action={
        <span className="flex items-center gap-1">
          <IconButton size="sm" label={`Añadir nodo hijo dentro de ${node.name}`} onClick={() => onAddChild(node)}>
            <Plus aria-hidden="true" className="size-3.5" />
          </IconButton>
          <IconButton size="sm" label={`Editar ${node.name}`} onClick={() => onEdit(node)}>
            <Pencil aria-hidden="true" className="size-3.5" />
          </IconButton>
          <IconButton size="sm" label={`Eliminar ${node.name}`} onClick={() => onDelete(node)}>
            <Trash2 aria-hidden="true" className="size-3.5" />
          </IconButton>
        </span>
      }
    >
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-control border border-line bg-surface-sunken text-ink-faint">
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{node.name}</p>
          <p className="mt-0.5 text-[11px] text-ink-faint">{TYPE_LABEL[node.nodeType]}</p>
        </div>
      </div>

      {/* Ruta completa calculada */}
      <nav aria-label="Ruta del nodo" className="mt-4 flex flex-wrap items-center gap-1 text-[11px] text-ink-faint">
        <ChevronRight aria-hidden="true" className="size-3 text-ink-disabled" />
        {ancestors.map((ancestor) => (
          <span key={ancestor.id} className="flex items-center gap-1">
            <span>{ancestor.name}</span>
            <ChevronRight aria-hidden="true" className="size-3 text-ink-disabled" />
          </span>
        ))}
        <span className="text-ink-muted">{node.name}</span>
      </nav>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
        <div>
          <dt className="ui-label">Hijos directos</dt>
          <dd className="mt-0.5">{children.length}</dd>
        </div>
        <div>
          <dt className="ui-label">Descendientes</dt>
          <dd className="mt-0.5">{descendants}</dd>
        </div>
        <div>
          <dt className="ui-label">Parámetros</dt>
          <dd className="mt-0.5">
            {parametersQuery.status === 'loading'
              ? '—'
              : `${parameters.length} ${parameters.length === 1 ? 'definido' : 'definidos'}`}
          </dd>
        </div>
        <div>
          <dt className="ui-label">Nivel</dt>
          <dd className="mt-0.5">{depth + 1}</dd>
        </div>
      </dl>

      {node.description && (
        <p className="mt-4 border-t border-line pt-4 text-[13px] leading-relaxed text-ink-muted text-pretty">
          {node.description}
        </p>
      )}

      {/* Parámetros del nodo: solo lectura; su gestión llega en la Etapa 08 */}
      <div className="mt-4 border-t border-line pt-4">
        <div className="flex items-center justify-between">
          <p className="ui-label">Parámetros del nodo</p>
          {parametersQuery.status === 'loading' && <Spinner className="size-3 text-ink-faint" />}
        </div>
        {parameters.length === 0 && parametersQuery.status !== 'loading' ? (
          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
            Ninguno todavía. El alta de parámetros llega en la Etapa 08.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {parameters.map((parameter) => (
              <li key={parameter.id} className="flex items-center gap-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate text-ink-muted">{parameter.name}</span>
                <Badge>{DATA_TYPE_LABEL[parameter.dataType]}</Badge>
                {!parameter.isActive && <Badge>Inactivo</Badge>}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <span className="text-[11px] leading-relaxed text-ink-disabled">
            El árbol y los parámetros pertenecen solo a esta versión.
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <Button
          size="sm"
          leadingIcon={<Plus aria-hidden="true" className="size-4" />}
          onClick={() => onAddChild(node)}
        >
          Añadir nodo hijo
        </Button>
      </div>
    </Panel>
  )
}
