import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { Input } from '../../../components/forms/Input'
import { Select } from '../../../components/forms/Select'
import { Textarea } from '../../../components/forms/Textarea'
import { AppError } from '../../../lib/errors/AppError'
import { slugify } from '../../../lib/helpers/slugify'
import { cameraService } from '../../../services/cameraService'
import type { Camera } from '../../../services/types'
import {
  EMPTY_CAMERA_FORM,
  toCameraInput,
  validateCameraField,
  validateCameraForm,
} from '../validation'
import type { CameraField, CameraFieldErrors, CameraFormValues } from '../validation'

type CameraFormDialogProps = {
  open: boolean
  /** `null` = nueva cámara; con valor, edición. */
  camera: Camera | null
  onClose: () => void
  onSaved: (camera: Camera) => void
}

const toFormValues = (camera: Camera | null): CameraFormValues =>
  camera
    ? {
        name: camera.name,
        slug: camera.slug,
        description: camera.description ?? '',
        developer: camera.developer ?? '',
        websiteUrl: camera.websiteUrl ?? '',
        isActive: camera.isActive,
      }
    : EMPTY_CAMERA_FORM

/**
 * Alta y edición de cámaras. El slug se rellena solo a partir del nombre
 * mientras el usuario no lo haya editado a mano.
 */
export const CameraFormDialog = ({ open, camera, onClose, onSaved }: CameraFormDialogProps) => {
  const isEdit = camera !== null

  // El padre remonta este componente al abrirlo (prop `key`): el estado se
  // inicializa aquí sin efectos de sincronización.
  const [values, setValues] = useState<CameraFormValues>(() => toFormValues(camera))
  const [errors, setErrors] = useState<CameraFieldErrors>({})
  const [slugEdited, setSlugEdited] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const setTextField = (field: CameraField, value: string) => {
    const next = { ...values, [field]: value }

    // Slug automático hasta que el usuario decide escribirlo.
    if (field === 'name' && !slugEdited) next.slug = slugify(value)

    setValues(next)
    setErrors((previous) => ({ ...previous, [field]: validateCameraField(field, next) }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const nextErrors = validateCameraForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const saved = isEdit
        ? await cameraService.update(camera.id, toCameraInput(values))
        : await cameraService.create(toCameraInput(values))

      onSaved(saved)
      onClose()
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'No se pudo guardar la cámara. Reintenta.'
      setFormError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={isEdit ? 'Editar cámara' : 'Nueva cámara'}
      description={
        isEdit
          ? 'Los cambios se guardan en la base de datos al enviar el formulario.'
          : 'LMC, AGC, BSG o cualquier otra modificación. Son registros de datos, no opciones fijas.'
      }
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <FormField id="camera-name" label="Nombre" error={errors.name} required>
          <Input
            id="camera-name"
            name="name"
            value={values.name}
            invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'camera-name-error' : undefined}
            maxLength={120}
            autoComplete="off"
            placeholder="Ej. LMC 8.4 para mi móvil"
            onChange={(event) => setTextField('name', event.target.value)}
            onBlur={() => {
              setErrors((previous) => ({ ...previous, name: validateCameraField('name', values) }))
            }}
            disabled={saving}
          />
        </FormField>

        <FormField
          id="camera-slug"
          label="Identificador (slug)"
          hint="Se usa en búsquedas y documentos. Minúsculas, números y guiones."
          error={errors.slug}
          required
        >
          <Input
            id="camera-slug"
            name="slug"
            value={values.slug}
            invalid={Boolean(errors.slug)}
            aria-describedby={errors.slug ? 'camera-slug-error' : 'camera-slug-hint'}
            maxLength={60}
            autoComplete="off"
            className="font-mono text-[13px]"
            placeholder="lmc-8-4"
            onChange={(event) => {
              setSlugEdited(true)
              setTextField('slug', event.target.value)
            }}
            onBlur={() => {
              setErrors((previous) => ({ ...previous, slug: validateCameraField('slug', values) }))
            }}
            disabled={saving}
          />
        </FormField>

        <FormField
          id="camera-description"
          label="Descripción"
          hint="Para qué dispositivo o uso, sin escribir valores técnicos aún."
          error={errors.description}
        >
          <Textarea
            id="camera-description"
            name="description"
            value={values.description}
            invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'camera-description-error' : 'camera-description-hint'}
            placeholder="Opcional"
            onChange={(event) => setTextField('description', event.target.value)}
            onBlur={() => {
              setErrors((previous) => ({ ...previous, description: validateCameraField('description', values) }))
            }}
            disabled={saving}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="camera-developer" label="Desarrollador" error={errors.developer}>
            <Input
              id="camera-developer"
              name="developer"
              value={values.developer}
              invalid={Boolean(errors.developer)}
              aria-describedby={errors.developer ? 'camera-developer-error' : undefined}
              placeholder="Opcional"
              autoComplete="off"
              onChange={(event) => setTextField('developer', event.target.value)}
              onBlur={() => {
                setErrors((previous) => ({ ...previous, developer: validateCameraField('developer', values) }))
              }}
              disabled={saving}
            />
          </FormField>

          <FormField id="camera-status" label="Estado">
            <Select
              id="camera-status"
              name="isActive"
              value={values.isActive ? 'active' : 'archived'}
              onChange={(event) => setValues((previous) => ({ ...previous, isActive: event.target.value === 'active' }))}
              disabled={saving}
            >
              <option value="active">Activa</option>
              <option value="archived">Archivada</option>
            </Select>
          </FormField>
        </div>

        <FormField
          id="camera-website"
          label="Enlace"
          hint="Página del proyecto o hilo de descarga."
          error={errors.websiteUrl}
        >
          <Input
            id="camera-website"
            name="websiteUrl"
            type="url"
            inputMode="url"
            value={values.websiteUrl}
            invalid={Boolean(errors.websiteUrl)}
            aria-describedby={errors.websiteUrl ? 'camera-website-error' : 'camera-website-hint'}
            placeholder="https://… (opcional)"
            autoComplete="off"
            onChange={(event) => setTextField('websiteUrl', event.target.value)}
            onBlur={() => {
              setErrors((previous) => ({ ...previous, websiteUrl: validateCameraField('websiteUrl', values) }))
            }}
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
            {isEdit ? 'Guardar cambios' : 'Crear cámara'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
