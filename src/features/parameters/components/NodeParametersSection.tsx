import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, Copy, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { Badge } from '../../../components/common/Badge'
import { IconButton } from '../../../components/common/IconButton'
import { useToast } from '../../../components/feedback/ToastContext'
import { toAppError } from '../../../lib/errors/AppError'
import { parameterService } from '../../../services/parameterService'
import type { Parameter, ParameterNode } from '../../../services/types'
import { ParameterFormDialog } from './ParameterFormDialog'
import { DATA_TYPE_LABEL, SOURCE_LABEL, formatDefaultValue } from '../valueFormat'

type NodeParametersSectionProps = {
  node: ParameterNode
  parameters: Parameter[]
  onChanged: () => void
}

const toCopyInput = (parameter: Parameter, sortOrder: number) => ({
  nodeId: parameter.nodeId,
  name: `${parameter.name} (copia)`,
  key: null,
  description: parameter.description,
  dataType: parameter.dataType,
  unit: parameter.unit,
  defaultValue: parameter.defaultValue ?? null,
  defaultValueSource: parameter.defaultValueSource,
  defaultValueConfidence: parameter.defaultValueConfidence,
  allowedValues: parameter.allowedValues,
  sortOrder,
  isActive: parameter.isActive,
})

/** Lista de parámetros del nodo con todas sus acciones (Etapa 8). */
export const NodeParametersSection = ({ node, parameters, onChanged }: NodeParametersSectionProps) => {
  const { notify } = useToast()
  const { cameraId, versionId } = useParams()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Parameter | null>(null)
  const [duplicating, setDuplicating] = useState<Parameter | null>(null)
  const [duplicateBusy, setDuplicateBusy] = useState(false)
  const [deleting, setDeleting] = useState<Parameter | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (parameter: Parameter) => {
    setEditing(parameter)
    setFormOpen(true)
  }

  const handleSaved = (parameter: Parameter, mode: 'create' | 'edit') => {
    notify({
      title: mode === 'create' ? 'Parámetro creado' : 'Parámetro actualizado',
      description: parameter.name,
      tone: 'success',
    })
    onChanged()
  }

  const confirmDuplicate = async () => {
    if (!duplicating) return
    setDuplicateBusy(true)
    try {
      const copy = await parameterService.create(toCopyInput(duplicating, duplicating.sortOrder + 1))
      notify({
        title: 'Parámetro duplicado',
        description: `${copy.name}. Se copió sin clave técnica para evitar duplicados.`,
        tone: 'success',
      })
      setDuplicating(null)
      onChanged()
    } catch (cause) {
      notify({ title: 'No se pudo duplicar', description: toAppError(cause).message, tone: 'danger' })
    } finally {
      setDuplicateBusy(false)
    }
  }

  const toggleActive = async (parameter: Parameter) => {
    try {
      const updated = await parameterService.setActive(parameter.id, !parameter.isActive)
      notify({
        title: updated.isActive ? 'Parámetro reactivado' : 'Parámetro desactivado',
        description: updated.isActive ? 'Vuelve a considerarse activo.' : 'Se conserva; deja de usarse.',
        tone: 'success',
      })
      onChanged()
    } catch (cause) {
      notify({ title: 'No se pudo cambiar el estado', description: toAppError(cause).message, tone: 'danger' })
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await parameterService.remove(deleting.id)
      notify({ title: 'Parámetro eliminado', description: deleting.name, tone: 'success' })
      setDeleting(null)
      onChanged()
    } catch (cause) {
      notify({
        title: 'No se pudo eliminar',
        description: `${toAppError(cause).message} Si ya tiene valores en perfiles, desactívalo en lugar de borrarlo.`,
        tone: 'danger',
      })
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="ui-label">Parámetros del nodo</p>
        <Button size="sm" leadingIcon={<Plus aria-hidden="true" className="size-3.5" />} onClick={openCreate}>
          Añadir
        </Button>
      </div>

      {parameters.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">
          Este nodo no tiene parámetros. Añade los que documentes: nombre, tipo y valor predeterminado con su
          procedencia.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {parameters.map((parameter) => (
            <li
              key={parameter.id}
              className="rounded-control border border-line bg-surface-sunken/60 px-3 py-2.5 transition-colors hover:bg-surface-sunken"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      to={`/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}/parameters/${parameter.id}`}
                      className="truncate text-[13px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:text-accent"
                    >
                      {parameter.name}
                    </Link>
                    <Badge>{DATA_TYPE_LABEL[parameter.dataType]}</Badge>
                    {!parameter.isActive && <Badge tone="warning">Inactivo</Badge>}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                    Predeterminado: <span className="text-ink-muted">{formatDefaultValue(parameter)}</span>
                    {' · '}
                    {SOURCE_LABEL[parameter.defaultValueSource]}
                    {parameter.defaultValueConfidence
                      ? ` · certeza ${parameter.defaultValueConfidence === 'high' ? 'alta' : parameter.defaultValueConfidence === 'medium' ? 'media' : 'baja'}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Link
                    to={`/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}/parameters/${parameter.id}`}
                    aria-label={`Ver ficha de ${parameter.name}`}
                    title="Ver ficha"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-control text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </Link>
                  <IconButton size="sm" label={`Editar ${parameter.name}`} onClick={() => openEdit(parameter)}>
                    <Pencil aria-hidden="true" className="size-3.5" />
                  </IconButton>
                  <IconButton size="sm" label={`Duplicar ${parameter.name}`} onClick={() => setDuplicating(parameter)}>
                    <Copy aria-hidden="true" className="size-3.5" />
                  </IconButton>
                  <IconButton
                    size="sm"
                    label={parameter.isActive ? `Desactivar ${parameter.name}` : `Reactivar ${parameter.name}`}
                    onClick={() => void toggleActive(parameter)}
                  >
                    {parameter.isActive ? (
                      <Archive aria-hidden="true" className="size-3.5" />
                    ) : (
                      <ArchiveRestore aria-hidden="true" className="size-3.5" />
                    )}
                  </IconButton>
                  <IconButton size="sm" label={`Eliminar ${parameter.name}`} onClick={() => setDeleting(parameter)}>
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </IconButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ParameterFormDialog
        key={`parameter-form-${formOpen ? 'open' : 'closed'}-${editing?.id ?? 'new'}-${node.id}`}
        open={formOpen}
        node={node}
        parameter={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={duplicating !== null}
        onClose={() => setDuplicating(null)}
        onConfirm={() => void confirmDuplicate()}
        title="Duplicar parámetro"
        confirmLabel="Duplicar"
        loading={duplicateBusy}
      >
        Se creará una copia de <strong className="text-ink">{duplicating?.name}</strong> llamada «
        {duplicating?.name} (copia)» sin clave técnica, para no chocar con la existente. El valor predeterminado y su
        procedencia se copian tal cual.
      </ConfirmDialog>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title="Eliminar parámetro"
        confirmLabel="Eliminar"
        tone="danger"
        loading={deleteBusy}
      >
        Se eliminará el parámetro <strong className="text-ink">{deleting?.name}</strong>. Si ya tiene valores en algún
        perfil, la base lo impedirá y lo correcto será desactivarlo.
      </ConfirmDialog>
    </div>
  )
}
