import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { FileUp } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { Input } from '../../../components/forms/Input'
import { toAppError } from '../../../lib/errors/AppError'
import { slugify } from '../../../lib/helpers/slugify'
import { catalogTransferService } from '../../../services/catalogTransferService'
import type { CameraBackup } from '../exportSchema'
import { parseJsonText, summarizeBackup, validateCameraBackup } from '../exportSchema'

type ImportCatalogDialogProps = {
  open: boolean
  onClose: () => void
  onImported: (cameraId: string, counts: { versions: number; nodes: number; parameters: number; configurations: number; values: number; experiments: number; changes: number }) => void
}

/**
 * Importa un respaldo validado creando una cámara nueva.
 * Nada se escribe hasta confirmar y el resumen/errores se muestran antes.
 */
export const ImportCatalogDialog = ({ open, onClose, onImported }: ImportCatalogDialogProps) => {
  const [fileName, setFileName] = useState<string | null>(null)
  const [backup, setBackup] = useState<CameraBackup | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTaken, setSlugTaken] = useState(false)
  const [includeExperiments, setIncludeExperiments] = useState(true)
  const [importing, setImporting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const reset = () => {
    setFileName(null)
    setBackup(null)
    setErrors([])
    setName('')
    setSlug('')
    setSlugTaken(false)
    setIncludeExperiments(true)
    setFormError(null)
  }

  const checkSlug = async (value: string) => {
    if (!value.trim()) {
      setSlugTaken(false)
      return
    }
    try {
      setSlugTaken(await catalogTransferService.cameraSlugExists(value.trim()))
    } catch {
      setSlugTaken(false)
    }
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setFormError(null)
    setBackup(null)
    setErrors([])

    const parsed = parseJsonText(await file.text())
    if (!parsed.data) {
      setErrors(parsed.errors)
      return
    }

    const validation = validateCameraBackup(parsed.data)
    if (!validation.data) {
      setErrors(validation.errors.slice(0, 20))
      return
    }

    setBackup(validation.data)
    setErrors([])
    setName(validation.data.camera.name)
    const suggestedSlug = slugify(validation.data.camera.slug)
    setSlug(suggestedSlug)
    setIncludeExperiments(summarizeBackup(validation.data).hasExperiments)
    await checkSlug(suggestedSlug)
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slug || slug === slugify(name)) {
      const next = slugify(value)
      setSlug(next)
      void checkSlug(next)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!backup) return
    if (name.trim().length === 0 || slug.trim().length === 0) {
      setFormError('Indica un nombre y un identificador para la cámara importada.')
      return
    }
    if (slugTaken) {
      setFormError('Ese identificador ya existe. Cambia el slug antes de importar.')
      return
    }

    setImporting(true)
    setFormError(null)
    try {
      const payload: CameraBackup = includeExperiments
        ? backup
        : { ...backup, versions: backup.versions.map((version) => ({ ...version, experiments: [] })) }
      const result = await catalogTransferService.importCameraBackup(payload, { name, slug })
      onImported(result.cameraId, result.counts)
      reset()
      onClose()
    } catch (cause) {
      const appError = toAppError(cause)
      setFormError(
        appError.code === 'conflict'
          ? 'No se pudo importar: el identificador ya existe o hay un dato duplicado. Revisa el slug.'
          : appError.message,
      )
    } finally {
      setImporting(false)
    }
  }

  const summary = backup ? summarizeBackup(backup) : null
  const canImport = Boolean(backup) && errors.length === 0 && !slugTaken && !importing

  return (
    <Dialog
      open={open}
      onClose={importing ? () => undefined : onClose}
      title="Importar respaldo"
      description="Crea una cámara nueva con versiones, niveles, parámetros, valores e historial del archivo. Nunca sobrescribe datos existentes."
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <div className="rounded-control border border-dashed border-line-strong bg-surface-sunken/50 px-4 py-5 text-center">
          <FileUp aria-hidden="true" className="mx-auto size-5 text-ink-faint" />
          <label htmlFor="backup-file" className="mt-2 block cursor-pointer text-[13px] font-medium text-ink">
            Elegir archivo JSON
          </label>
          <input
            id="backup-file"
            type="file"
            accept="application/json,.json"
            className="mt-2 block w-full text-xs text-ink-faint file:mr-3 file:rounded-control file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-xs file:text-ink"
            onChange={(event) => void handleFile(event)}
            disabled={importing}
          />
          {fileName && <p className="mt-2 text-[11px] text-ink-disabled">{fileName}</p>}
        </div>

        {errors.length > 0 && (
          <div role="alert" className="rounded-control border border-danger/30 bg-danger/[0.05] px-4 py-3">
            <p className="text-xs font-medium text-danger">El archivo no se puede importar:</p>
            <ul className="mt-1 max-h-40 list-disc space-y-1 overflow-y-auto pl-4 text-[11px] leading-relaxed text-danger">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {backup && summary && (
          <>
            <div className="rounded-control border border-line bg-surface-sunken px-4 py-3 text-xs leading-relaxed text-ink-muted">
              <p>
                <strong className="text-ink">{summary.cameraName}</strong> · esquema v{backup.schemaVersion} ·{' '}
                {summary.versions} {summary.versions === 1 ? 'versión' : 'versiones'}
              </p>
              <p className="mt-1">
                {summary.nodes} {summary.nodes === 1 ? 'nivel' : 'niveles'} · {summary.parameters}{' '}
                {summary.parameters === 1 ? 'parámetro' : 'parámetros'} · {summary.values}{' '}
                {summary.values === 1 ? 'valor heredado' : 'valores heredados'} · {summary.changes}{' '}
                {summary.changes === 1 ? 'cambio' : 'cambios'} · {summary.experiments}{' '}
                {summary.experiments === 1 ? 'experimento heredado' : 'experimentos heredados'}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="import-name" label="Nombre de la cámara" required>
                <Input
                  id="import-name"
                  value={name}
                  maxLength={100}
                  autoComplete="off"
                  onChange={(event) => handleNameChange(event.target.value)}
                  disabled={importing}
                />
              </FormField>
              <FormField
                id="import-slug"
                label="Identificador (slug)"
                required
                error={slugTaken ? 'Ya existe una cámara con ese identificador.' : undefined}
              >
                <Input
                  id="import-slug"
                  value={slug}
                  invalid={slugTaken}
                  maxLength={60}
                  autoComplete="off"
                  className="font-mono text-[13px]"
                  onChange={(event) => {
                    setSlug(event.target.value)
                    void checkSlug(event.target.value)
                  }}
                  onBlur={() => void checkSlug(slug)}
                  disabled={importing}
                />
              </FormField>
            </div>

            {summary.hasExperiments && (
              <label className="flex items-start gap-3 rounded-control border border-line bg-surface-sunken px-4 py-3">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--color-accent)]"
                  checked={includeExperiments}
                  onChange={(event) => setIncludeExperiments(event.target.checked)}
                  disabled={importing}
                />
                <span className="text-[13px] leading-relaxed text-ink-muted">
                  Incluir experimentos e historial ({summary.experiments} experimentos, {summary.changes} cambios)
                  <span className="mt-0.5 block text-xs text-ink-faint">
                    Se conservan fechas, valores anteriores/nuevos, ruta congelada y si se aplicaron al perfil.
                  </span>
                </span>
              </label>
            )}
          </>
        )}

        {formError && (
          <p role="alert" className="text-xs leading-relaxed text-danger">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button
            type="button"
            onClick={() => {
              reset()
              onClose()
            }}
            disabled={importing}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={importing} disabled={!canImport}>
            Importar cámara
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
