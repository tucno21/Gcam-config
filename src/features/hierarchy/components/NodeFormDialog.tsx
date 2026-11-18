import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { Input } from '../../../components/forms/Input'
import { Select } from '../../../components/forms/Select'
import { Textarea } from '../../../components/forms/Textarea'
import { toAppError } from '../../../lib/errors/AppError'
import { nodeService } from '../../../services/nodeService'
import type { NodeType, ParameterNode } from '../../../services/types'
import { NODE_TYPES } from '../../../services/types'

export type NodeFormDialogProps = {
  open: boolean
  versionId: string
  /** Nodo padre al crear; `null` = raíz. En edición es el propio nodo. */
  target: ParameterNode | null
  /** `edit` cuando `target` es el nodo a modificar. */
  mode: 'create' | 'edit'
  parentName: string | null
  onClose: () => void
  onSaved: (node: ParameterNode, mode: 'create' | 'edit') => void
}

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  category: 'Categoría',
  group: 'Grupo',
  subgroup: 'Subgrupo',
}

type FormValues = { name: string; nodeType: NodeType; description: string }

/** Alta y edición de nodos del árbol (nombre, tipo y descripción). */
export const NodeFormDialog = ({
  open,
  versionId,
  target,
  mode,
  parentName,
  onClose,
  onSaved,
}: NodeFormDialogProps) => {
  const isEdit = mode === 'edit'
  const [values, setValues] = useState<FormValues>(() =>
    isEdit && target
      ? { name: target.name, nodeType: target.nodeType, description: target.description ?? '' }
      : { name: '', nodeType: 'group', description: '' },
  )
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const validateName = (value: string): string | undefined => {
    if (value.trim().length === 0) return 'Escribe el nombre del nodo.'
    if (value.trim().length > 120) return 'Máximo 120 caracteres.'
    return undefined
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    const nameMessage = validateName(values.name)
    setNameError(nameMessage)
    if (nameMessage) return

    setSaving(true)
    try {
      if (isEdit && target) {
        const updated = await nodeService.update(target.id, {
          name: values.name.trim(),
          description: values.description.trim() || null,
          nodeType: values.nodeType,
        })
        onSaved(updated, 'edit')
      } else {
        const created = await nodeService.create({
          cameraVersionId: versionId,
          parentId: target?.id ?? null,
          name: values.name.trim(),
          description: values.description.trim() || null,
          nodeType: values.nodeType,
        })
        onSaved(created, 'create')
      }
      onClose()
    } catch (cause) {
      setFormError(toAppError(cause).message)
    } finally {
      setSaving(false)
    }
  }

  const contextLabel = isEdit
    ? 'Editar nodo'
    : target
      ? `Nuevo nodo dentro de «${parentName ?? ''}»`
      : 'Nuevo nodo raíz'

  return (
    <Dialog open={open} onClose={saving ? () => undefined : onClose} title={contextLabel}>
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <FormField id="node-name" label="Nombre" error={nameError} required>
          <Input
            id="node-name"
            name="name"
            value={values.name}
            invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'node-name-error' : undefined}
            maxLength={120}
            autoComplete="off"
            placeholder="Ej. Configuración de cámara"
            onChange={(event) => {
              const value = event.target.value
              setValues((previous) => ({ ...previous, name: value }))
              setNameError(validateName(value))
            }}
            onBlur={() => setNameError(validateName(values.name))}
            disabled={saving}
          />
        </FormField>

        <FormField id="node-type" label="Tipo">
          <Select
            id="node-type"
            name="nodeType"
            value={values.nodeType}
            onChange={(event) => setValues((previous) => ({ ...previous, nodeType: event.target.value as NodeType }))}
            disabled={saving}
          >
            {NODE_TYPES.map((type) => (
              <option key={type} value={type}>
                {NODE_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField id="node-description" label="Descripción" hint="Qué agrupa este nodo o cómo se usa.">
          <Textarea
            id="node-description"
            name="description"
            value={values.description}
            placeholder="Opcional"
            rows={3}
            onChange={(event) => setValues((previous) => ({ ...previous, description: event.target.value }))}
            disabled={saving}
          />
        </FormField>

        {formError && (
          <p role="alert" className="text-xs leading-relaxed text-danger">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {isEdit ? 'Guardar cambios' : 'Crear nodo'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
