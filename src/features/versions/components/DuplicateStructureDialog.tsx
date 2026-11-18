import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { Input } from '../../../components/forms/Input'
import { Select } from '../../../components/forms/Select'
import { toAppError } from '../../../lib/errors/AppError'
import { versionService } from '../../../services/versionService'
import type { CameraVersion } from '../../../services/types'

type DuplicateStructureDialogProps = {
  open: boolean
  cameraId: string
  cameraName: string
  versions: CameraVersion[]
  /** Versión desde la que se abrió el diálogo. */
  sourceVersion: CameraVersion | null
  onClose: () => void
  onDuplicated: (result: { targetId: string; nodes: number; parameters: number }) => void
}

const NEW_VERSION = '__new__'

/**
 * Copia explícita de estructura entre versiones de la misma cámara.
 * Nunca es automática: muestra qué se copiará y exige confirmación.
 */
export const DuplicateStructureDialog = ({
  open,
  cameraId,
  cameraName,
  versions,
  sourceVersion,
  onClose,
  onDuplicated,
}: DuplicateStructureDialogProps) => {
  const withStructure = versions.filter((candidate) => candidate.id !== sourceVersion?.id)
  const [sourceId, setSourceId] = useState<string>(sourceVersion?.id ?? withStructure[0]?.id ?? '')
  const [targetId, setTargetId] = useState<string>('')
  const [newLabel, setNewLabel] = useState('')
  const [includeValues, setIncludeValues] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const source = versions.find((candidate) => candidate.id === sourceId) ?? null
  const target = versions.find((candidate) => candidate.id === targetId) ?? null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!source) {
      setError('Elige la versión de origen con estructura.')
      return
    }
    if (!targetId) {
      setError('Elige la versión de destino.')
      return
    }
    if (targetId === NEW_VERSION && newLabel.trim().length === 0) {
      setError('Escribe la etiqueta de la versión nueva.')
      return
    }

    setBusy(true)
    try {
      let destination = target
      if (targetId === NEW_VERSION) {
        destination = await versionService.create(cameraId, { version: newLabel.trim() })
      }
      if (!destination) throw new Error('No se encontró la versión de destino.')

      const result = await versionService.duplicateStructure(source.id, destination.id, { includeValues })
      onDuplicated({ targetId: destination.id, ...result })
      onClose()
    } catch (cause) {
      setError(toAppError(cause).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Duplicar estructura"
      description={`Copia el árbol de parámetros entre versiones de ${cameraName}.`}
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <FormField id="duplicate-source" label="Versión de origen" required>
          <Select
            id="duplicate-source"
            value={sourceId}
            aria-describedby="duplicate-source-hint"
            onChange={(event) => setSourceId(event.target.value)}
            disabled={busy}
          >
            {versions.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.version}
                {candidate.nodeCount > 0 ? ` — ${candidate.nodeCount} nodos` : ' — sin estructura'}
              </option>
            ))}
          </Select>
          <p id="duplicate-source-hint" className="mt-1 text-xs leading-relaxed text-ink-faint">
            {source
              ? source.nodeCount > 0
                ? `Se copiarán ${source.nodeCount} ${source.nodeCount === 1 ? 'nodo' : 'nodos'} y los parámetros definidos en ellos.`
                : 'Esta versión no tiene estructura: no hay nada que copiar.'
              : undefined}
          </p>
        </FormField>

        <FormField id="duplicate-target" label="Versión de destino" required>
          <Select
            id="duplicate-target"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            disabled={busy || versions.length === 0}
          >
            <option value="">Elegir…</option>
            {versions
              .filter((candidate) => candidate.id !== sourceId)
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.version}
                  {candidate.nodeCount > 0
                    ? ` — sustituirá su vista actual (${candidate.nodeCount} nodos propios)`
                    : ' — vacía'}
                </option>
              ))}
            <option value={NEW_VERSION}>Crear una versión nueva…</option>
          </Select>
        </FormField>

        {targetId === NEW_VERSION && (
          <FormField id="duplicate-new-label" label="Etiqueta de la versión nueva" required>
            <Input
              id="duplicate-new-label"
              value={newLabel}
              maxLength={40}
              autoComplete="off"
              className="font-mono text-[13px]"
              placeholder="Ej. 8.5"
              onChange={(event) => setNewLabel(event.target.value)}
              disabled={busy}
            />
          </FormField>
        )}

        <div className="rounded-control border border-line bg-surface-sunken px-4 py-3 text-xs leading-relaxed text-ink-muted">
          <p>La copia crea niveles y parámetros nuevos en la versión de destino, con la misma jerarquía, orden y estado.</p>
          <label className="mt-3 flex items-start gap-3 rounded-control border border-line bg-surface px-3 py-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
              checked={includeValues}
              onChange={(event) => setIncludeValues(event.target.checked)}
              disabled={busy}
            />
            <span>
              <span className="block text-[13px] text-ink">Copiar también los valores actuales y las notas</span>
              <span className="mt-0.5 block text-[11px] text-ink-faint">
                Útil para empezar AGC 9.4 con la configuración que ya usas en 8.2 y ajustar desde ahí.
              </span>
            </span>
          </label>
          <p className="mt-2">
            <strong className="text-ink">No se copia el historial</strong>: pertenece a la versión donde se probó.
          </p>
          {target && target.nodeCount > 0 && (
            <p className="mt-1 text-danger">
              La versión {target.version} ya tiene {target.nodeCount}{' '}
              {target.nodeCount === 1 ? 'nivel' : 'niveles'} propios: la copia se añadirá a lo que tenga.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-xs leading-relaxed text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            Duplicar estructura
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
