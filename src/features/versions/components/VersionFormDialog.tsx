import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { Input } from '../../../components/forms/Input'
import { Textarea } from '../../../components/forms/Textarea'
import { toAppError } from '../../../lib/errors/AppError'
import { versionService } from '../../../services/versionService'
import type { CameraVersion } from '../../../services/types'
import { EMPTY_VERSION_FORM, toVersionInput, validateVersionField, validateVersionForm } from '../validation'
import type { VersionField, VersionFieldErrors, VersionFormValues } from '../validation'

type VersionFormDialogProps = {
  open: boolean
  cameraId: string
  cameraName: string
  /** `null` = nueva versión; con valor, edición. */
  version: CameraVersion | null
  onClose: () => void
  onSaved: (version: CameraVersion) => void
}

const toFormValues = (version: CameraVersion | null): VersionFormValues =>
  version
    ? {
        version: version.version,
        releaseLabel: version.releaseLabel ?? '',
        notes: version.notes ?? '',
        isDefault: version.isDefault,
      }
    : EMPTY_VERSION_FORM

/** Alta y edición de versiones dentro de una cámara. */
export const VersionFormDialog = ({
  open,
  cameraId,
  cameraName,
  version,
  onClose,
  onSaved,
}: VersionFormDialogProps) => {
  const isEdit = version !== null

  // El padre remonta este componente al abrirlo (prop `key`): estado limpio sin efectos.
  const [values, setValues] = useState<VersionFormValues>(() => toFormValues(version))
  const [errors, setErrors] = useState<VersionFieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const setTextField = (field: VersionField, value: string) => {
    const next = { ...values, [field]: value }
    setValues(next)
    setErrors((previous) => ({ ...previous, [field]: validateVersionField(field, next) }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const nextErrors = validateVersionForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const saved = isEdit
        ? await versionService.update(version.id, toVersionInput(values))
        : await versionService.create(cameraId, toVersionInput(values))

      // Marcar predeterminada después de guardar: la base solo permite una.
      if (values.isDefault && !saved.isDefault) {
        await versionService.setDefault(cameraId, saved.id)
      }

      onSaved(saved)
      onClose()
    } catch (cause) {
      const appError = toAppError(cause)
      setFormError(
        appError.code === 'conflict'
          ? `Ya existe una versión con esa etiqueta en ${cameraName}.`
          : appError.message,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={isEdit ? 'Editar versión' : 'Nueva versión'}
      description={
        isEdit
          ? `Versión de ${cameraName}. La etiqueta debe ser única dentro de la cámara.`
          : `Nueva versión de ${cameraName}. Empieza sin estructura: se construye después.`
      }
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <FormField id="version-label" label="Etiqueta de versión" error={errors.version} required>
          <Input
            id="version-label"
            name="version"
            value={values.version}
            invalid={Boolean(errors.version)}
            aria-describedby={errors.version ? 'version-label-error' : undefined}
            maxLength={40}
            autoComplete="off"
            className="font-mono text-[13px]"
            placeholder="Ej. 8.4"
            onChange={(event) => setTextField('version', event.target.value)}
            onBlur={() => {
              setErrors((previous) => ({ ...previous, version: validateVersionField('version', values) }))
            }}
            disabled={saving}
          />
        </FormField>

        <FormField id="version-release" label="Etiqueta de lanzamiento" error={errors.releaseLabel}>
          <Input
            id="version-release"
            name="releaseLabel"
            value={values.releaseLabel}
            invalid={Boolean(errors.releaseLabel)}
            aria-describedby={errors.releaseLabel ? 'version-release-error' : undefined}
            maxLength={60}
            autoComplete="off"
            placeholder="Opcional. Ej. Miq6.apk"
            onChange={(event) => setTextField('releaseLabel', event.target.value)}
            onBlur={() => {
              setErrors((previous) => ({ ...previous, releaseLabel: validateVersionField('releaseLabel', values) }))
            }}
            disabled={saving}
          />
        </FormField>

        <FormField id="version-notes" label="Notas" error={errors.notes}>
          <Textarea
            id="version-notes"
            name="notes"
            value={values.notes}
            invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? 'version-notes-error' : undefined}
            placeholder="Opcional. De qué variante o experimento parte esta versión."
            onChange={(event) => setTextField('notes', event.target.value)}
            onBlur={() => {
              setErrors((previous) => ({ ...previous, notes: validateVersionField('notes', values) }))
            }}
            disabled={saving}
          />
        </FormField>

        <label className="flex items-start gap-3 rounded-control border border-line bg-surface-sunken px-4 py-3">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-accent)]"
            checked={values.isDefault}
            onChange={(event) => setValues((previous) => ({ ...previous, isDefault: event.target.checked }))}
            disabled={saving}
          />
          <span className="text-[13px] leading-relaxed text-ink-muted">
            Versión predeterminada
            <span className="mt-0.5 block text-xs text-ink-faint">
              Solo puede haber una por cámara: se desmarca la anterior automáticamente.
            </span>
          </span>
        </label>

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
            {isEdit ? 'Guardar cambios' : 'Crear versión'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
