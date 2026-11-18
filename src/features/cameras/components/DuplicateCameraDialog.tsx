import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { Input } from '../../../components/forms/Input'
import { toAppError } from '../../../lib/errors/AppError'
import { cameraService } from '../../../services/cameraService'
import type { Camera } from '../../../services/types'
import { validateCameraForm } from '../validation'

type DuplicateCameraDialogProps = {
  open: boolean
  camera: Camera
  onClose: () => void
  onDuplicated: (camera: Camera) => void
}

/** Duplica una cámara con todos sus niveles, parámetros y valores actuales. */
export const DuplicateCameraDialog = ({ open, camera, onClose, onDuplicated }: DuplicateCameraDialogProps) => {
  const [name, setName] = useState(`${camera.name} (copia)`)
  const [slug, setSlug] = useState(`${camera.slug}-copia`)
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({})
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    const nextErrors = validateCameraForm({
      name,
      slug,
      description: camera.description ?? '',
      developer: camera.developer ?? '',
      websiteUrl: camera.websiteUrl ?? '',
      isActive: true,
    })
    setErrors({ name: nextErrors.name, slug: nextErrors.slug })
    if (nextErrors.name || nextErrors.slug) return

    setBusy(true)
    try {
      const created = await cameraService.duplicate(camera.id, { name, slug })
      onDuplicated(created)
      onClose()
    } catch (cause) {
      const error = toAppError(cause)
      setFormError(error.code === 'conflict' ? 'Ya existe una cámara con ese identificador.' : error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={`Duplicar «${camera.name}»`}
      description="Copia los niveles, los parámetros, las notas y los valores actuales. El historial no se copia."
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <FormField id="duplicate-camera-name" label="Nombre de la nueva cámara" error={errors.name} required>
          <Input
            id="duplicate-camera-name"
            value={name}
            invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'duplicate-camera-name-error' : undefined}
            maxLength={120}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
            disabled={busy}
          />
        </FormField>

        <FormField
          id="duplicate-camera-slug"
          label="Identificador"
          hint="Único en tu cuenta. Solo minúsculas, números y guiones."
          error={errors.slug}
          required
        >
          <Input
            id="duplicate-camera-slug"
            value={slug}
            invalid={Boolean(errors.slug)}
            aria-describedby={errors.slug ? 'duplicate-camera-slug-error' : 'duplicate-camera-slug-hint'}
            maxLength={60}
            autoComplete="off"
            className="font-mono text-[13px]"
            onChange={(event) => setSlug(event.target.value)}
            disabled={busy}
          />
        </FormField>

        {formError && (
          <p role="alert" className="text-xs leading-relaxed text-danger">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            Duplicar cámara
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
