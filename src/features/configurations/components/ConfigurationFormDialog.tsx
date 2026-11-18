import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { Input } from '../../../components/forms/Input'
import { Textarea } from '../../../components/forms/Textarea'
import { toAppError } from '../../../lib/errors/AppError'
import { configurationService } from '../../../services/configurationService'
import type { Configuration } from '../../../services/types'
import {
  EMPTY_CONFIGURATION_FORM,
  toConfigurationInput,
  validateConfigurationField,
  validateConfigurationForm,
} from '../validation'
import type { ConfigurationField, ConfigurationFieldErrors, ConfigurationFormValues } from '../validation'

type ConfigurationFormDialogProps = {
  open: boolean
  versionId: string
  /** `null` = nuevo perfil; con valor, edición. */
  configuration: Configuration | null
  onClose: () => void
  onSaved: (configuration: Configuration, mode: 'create' | 'edit') => void
}

const toFormValues = (configuration: Configuration | null): ConfigurationFormValues =>
  configuration
    ? {
        name: configuration.name,
        description: configuration.description ?? '',
        isDefault: configuration.isDefault,
      }
    : EMPTY_CONFIGURATION_FORM

/** Alta y edición de perfiles de configuración. */
export const ConfigurationFormDialog = ({
  open,
  versionId,
  configuration,
  onClose,
  onSaved,
}: ConfigurationFormDialogProps) => {
  const isEdit = configuration !== null

  // El padre remonta al abrir (key): estado limpio sin efectos.
  const [values, setValues] = useState<ConfigurationFormValues>(() => toFormValues(configuration))
  const [errors, setErrors] = useState<ConfigurationFieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const setField = (field: ConfigurationField, value: string) => {
    const next = { ...values, [field]: value }
    setValues(next)
    setErrors((previous) => ({ ...previous, [field]: validateConfigurationField(field, next) }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const nextErrors = validateConfigurationForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const payload = toConfigurationInput(values)
      const saved = isEdit
        ? await configurationService.update(configuration.id, payload)
        : await configurationService.create({ cameraVersionId: versionId, ...payload })

      // Marcar predeterminado después de guardar: la base solo permite uno.
      const resulting =
        values.isDefault && !saved.isDefault
          ? await configurationService.setDefault(versionId, saved.id)
          : saved

      onSaved(resulting, isEdit ? 'edit' : 'create')
      onClose()
    } catch (cause) {
      const appError = toAppError(cause)
      setFormError(
        appError.code === 'conflict'
          ? 'Ya existe un perfil con ese nombre en esta versión.'
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
      title={isEdit ? 'Editar perfil' : 'Nuevo perfil'}
      description={
        isEdit
          ? 'Los valores personalizados se conservan al renombrar.'
          : 'Un perfil guarda valores concretos; los parámetros sin valor usan el predeterminado solo como referencia.'
      }
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <FormField id="profile-name" label="Nombre" error={errors.name} required>
          <Input
            id="profile-name"
            value={values.name}
            invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'profile-name-error' : undefined}
            maxLength={80}
            autoComplete="off"
            placeholder="Ej. Perfil nocturno"
            onChange={(event) => setField('name', event.target.value)}
            onBlur={() => setErrors((previous) => ({ ...previous, name: validateConfigurationField('name', values) }))}
            disabled={saving}
          />
        </FormField>

        <FormField id="profile-description" label="Descripción" error={errors.description}>
          <Textarea
            id="profile-description"
            rows={2}
            value={values.description}
            invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'profile-description-error' : undefined}
            placeholder="Opcional. Para qué situación sirve este perfil."
            onChange={(event) => setField('description', event.target.value)}
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
            Perfil predeterminado
            <span className="mt-0.5 block text-xs text-ink-faint">
              Solo puede haber uno por versión: se desmarca el anterior.
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
            {isEdit ? 'Guardar cambios' : 'Crear perfil'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
