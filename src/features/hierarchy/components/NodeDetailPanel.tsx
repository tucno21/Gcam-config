import { ChevronRight, CornerDownRight, Folder, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { IconButton } from '../../../components/common/IconButton'
import { Button } from '../../../components/common/Button'
import { Panel } from '../../../components/common/Panel'
import type { NodeType, Parameter, ParameterNode } from '../../../services/types'
import { NodeParametersSection } from '../../parameters/components/NodeParametersSection'
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

type NodeDetailPanelProps = {
  index: TreeIndex
  node: ParameterNode
  /** Parámetros de este nodo (ya filtrados). */
  parameters: Parameter[]
  onAddChild: (node: ParameterNode) => void
  onEdit: (node: ParameterNode) => void
  onDelete: (node: ParameterNode) => void
  onParametersChanged: () => void
}

/** Panel de detalle del nodo seleccionado: ruta, conteos, datos y parámetros. */
export const NodeDetailPanel = ({
  index,
  node,
  parameters,
  onAddChild,
  onEdit,
  onDelete,
  onParametersChanged,
}: NodeDetailPanelProps) => {
  const ancestors = ancestorsOf(index, node.id)
  const children = index.childrenByParent.get(node.id) ?? []
  const depth = ancestors.length
  const descendants = descendantCount(index, node.id)
  const Icon = TYPE_ICON[node.nodeType] ?? Folder

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
            {parameters.length} {parameters.length === 1 ? 'definido' : 'definidos'}
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

      <NodeParametersSection node={node} parameters={parameters} onChanged={onParametersChanged} />

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
