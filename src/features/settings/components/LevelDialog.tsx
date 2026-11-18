import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { Input } from '../../../components/forms/Input'
import { Textarea } from '../../../components/forms/Textarea'
import { toAppError } from '../../../lib/errors/AppError'
import { nodeService } from '../../../services/nodeService'
import type { ParameterNode } from '../../../services/types'
import { EMPTY_LEVEL_FORM, validateLevelForm } from '../validation'
import type { LevelFormValues } from '../validation'

type LevelDialogProps = {
  open: boolean
  versionId: string
  /** Nivel padre; `null` = nivel raíz. */
  parent: ParameterNode | null
  /** `null` = crear; con valor, editar. */
  level: ParameterNode | null
  onClose: () => void
  onSaved: (node: ParameterNode, mode: 'create' | 'edit') => void
}

/** Alta y edición de un nivel (una pantalla del menú de GCam). */
export const LevelDialog = ({ open, versionId, parent, level, onClose, onSaved }: LevelDialogProps) => {
  const isEdit = level !== null
  const [values, setValues] = useState<LevelFormValues>(() =>
    level ? { name: level.name, description: level.description ?? '' } : EMPTY_LEVEL_FORM,
  )
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const setField = (field: keyof LevelFormValues, value: string) => {
    const next = { ...values, [field]: value }
    setValues(next)
    setErrors((previous) => ({ ...previous, [field]: validateLevelForm(next)[field] }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    const nextErrors = validateLevelForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const saved = isEdit
        ? await nodeService.update(level.id, { name: values.name.trim(), description: values.description.trim() || null })
        : await nodeService.create({
            cameraVersionId: versionId,
            parentId: parent?.id ?? null,
            name: values.name.trim(),
            description: values.description.trim() || null,
            nodeType: parent ? 'subgroup' : 'category',
          })
      onSaved(saved, isEdit ? 'edit' : 'create')
      onClose()
    } catch (cause) {
      const error = toAppError(cause)
      setFormError(error.code === 'conflict' ? 'Ya existe un nivel con ese nombre aquí.' : error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={isEdit ? 'Editar nivel' : parent ? `Nuevo subnivel en «${parent.name}»` : 'Nuevo nivel'}
      description="Un nivel representa una pantalla del menú de la cámara (por ejemplo, «Photo Processing»)."
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <FormField id="level-name" label="Nombre del nivel" error={errors.name} required>
          <Input
            id="level-name"
            value={values.name}
            invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'level-name-error' : undefined}
            maxLength={160}
            autoComplete="off"
            placeholder="Ej. Photo Processing"
            onChange={(event) => setField('name', event.target.value)}
            onBlur={() => setErrors((previous) => ({ ...previous, name: validateLevelForm(values).name }))}
            disabled={saving}
          />
        </FormField>

        <FormField id="level-description" label="Descripción" hint="Opcional." error={errors.description}>
          <Textarea
            id="level-description"
            rows={2}
            value={values.description}
            invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'level-description-error' : 'level-description-hint'}
            placeholder="Qué agrupa esta pantalla."
            onChange={(event) => setField('description', event.target.value)}
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
            {isEdit ? 'Guardar cambios' : 'Crear nivel'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
