import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { Input } from '../../../components/forms/Input'
import { Select } from '../../../components/forms/Select'
import { toAppError } from '../../../lib/errors/AppError'
import { configurationService } from '../../../services/configurationService'
import { historyService } from '../../../services/historyService'
import type { Configuration, ConfigurationValue, Experiment, Parameter } from '../../../services/types'
import { parseDefaultValue } from '../../parameters/validation'
import { DATA_TYPE_LABEL, formatParameterValue } from '../../parameters/valueFormat'
import { TypedValueEditor } from '../../parameters/components/TypedValueEditor'
import { ancestorsOf } from '../../hierarchy/treeUtils'
import type { TreeIndex } from '../../hierarchy/treeUtils'

type ExperimentChangeDialogProps = {
  open: boolean
  experiment: Experiment
  configuration: Configuration
  parameters: Parameter[]
  values: ConfigurationValue[]
  index: TreeIndex
  onClose: () => void
  onSaved: (result: { applied: boolean }) => void
}

/**
 * Registra un cambio dentro de un experimento.
 *
 * - El valor **anterior** se toma del perfil en este momento.
 * - La **ruta** se congela como instantánea: renombrar nodos después no la altera.
 * - «Aplicar al perfil» actualiza `configuration_values` además de crear el
 *   registro append-only; sin esa marca el cambio solo queda como historial (D-031).
 */
export const ExperimentChangeDialog = ({
  open,
  experiment,
  configuration,
  parameters,
  values,
  index,
  onClose,
  onSaved,
}: ExperimentChangeDialogProps) => {
  const [parameterId, setParameterId] = useState('')
  const [rawValue, setRawValue] = useState('')
  const [reason, setReason] = useState('')
  const [observation, setObservation] = useState('')
  const [applyToProfile, setApplyToProfile] = useState(true)
  const [errors, setErrors] = useState<{ parameter?: string; value?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const parameter = parameters.find((candidate) => candidate.id === parameterId) ?? null

  const currentValue = useMemo(() => {
    if (!parameter) return null
    return values.find((value) => value.parameterId === parameter.id)?.value ?? null
  }, [parameter, values])

  const pathSnapshot = useMemo(() => {
    if (!parameter) return null
    const node = index.nodeById.get(parameter.nodeId)
    if (!node) return null
    return [...ancestorsOf(index, node.id).map((ancestor) => ancestor.name), node.name]
  }, [parameter, index])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const nextErrors: typeof errors = {}
    if (!parameter) nextErrors.parameter = 'Elige el parámetro modificado.'
    const parsed = parameter ? parseDefaultValue(parameter.dataType, rawValue, parameter.allowedValues ?? []) : null
    if (!parsed || parsed.error || parsed.value === null) {
      nextErrors.value = parsed?.error ?? 'Escribe el valor nuevo.'
    }
    setErrors(nextErrors)
    if (!parameter || !parsed || parsed.value === null || Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      // Primero se aplica al perfil (si corresponde) y después se registra el
      // cambio append-only. Un fallo al registrar deja constancia del error.
      if (applyToProfile) {
        await configurationService.setValue({
          configurationId: configuration.id,
          parameterId: parameter.id,
          value: parsed.value,
        })
      }

      await historyService.recordChange({
        experimentId: experiment.id,
        parameterId: parameter.id,
        previousValue: currentValue,
        newValue: parsed.value,
        reason: reason.trim() || null,
        observation: observation.trim() || null,
        pathSnapshot,
        appliedToProfile: applyToProfile,
      })

      onSaved({ applied: applyToProfile })
      onClose()
    } catch (cause) {
      setFormError(toAppError(cause).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title="Registrar cambio"
      description={`Experimento: ${experiment.title} · Perfil: ${configuration.name}`}
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <FormField id="change-parameter" label="Parámetro modificado" error={errors.parameter} required>
          <Select
            id="change-parameter"
            value={parameterId}
            invalid={Boolean(errors.parameter)}
            onChange={(event) => {
              setParameterId(event.target.value)
              setRawValue('')
              setErrors({})
            }}
            disabled={saving}
          >
            <option value="">Elegir…</option>
            {parameters.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} · {DATA_TYPE_LABEL[candidate.dataType]}
              </option>
            ))}
          </Select>
        </FormField>

        {parameter && (
          <>
            <div className="rounded-control border border-line bg-surface-sunken px-4 py-3 text-xs leading-relaxed text-ink-muted">
              <p>
                Valor anterior en «{configuration.name}»:{' '}
                <strong className="text-ink">
                  {currentValue === null ? 'sin valor personalizado' : formatParameterValue(parameter, currentValue)}
                </strong>
              </p>
              {pathSnapshot && (
                <p className="mt-1">
                  Ruta congelada: <span className="text-ink-muted">{pathSnapshot.join(' › ')}</span>
                </p>
              )}
            </div>

            <FormField id="change-value" label="Valor nuevo" error={errors.value} required>
              <TypedValueEditor
                id="change-value"
                dataType={parameter.dataType}
                value={rawValue}
                allowedValues={parameter.allowedValues ?? []}
                error={errors.value}
                disabled={saving}
                onChange={(next) => {
                  setRawValue(next)
                  setErrors((previous) => ({ ...previous, value: undefined }))
                }}
              />
            </FormField>

            <label className="flex items-start gap-3 rounded-control border border-line bg-surface-sunken px-4 py-3">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--color-accent)]"
                checked={applyToProfile}
                onChange={(event) => setApplyToProfile(event.target.checked)}
                disabled={saving}
              />
              <span className="text-[13px] leading-relaxed text-ink-muted">
                Aplicar al perfil ahora
                <span className="mt-0.5 block text-xs text-ink-faint">
                  {applyToProfile
                    ? 'Se actualizará el valor del perfil y quedará registrado en el historial.'
                    : 'Solo quedará como registro histórico: el perfil no cambia.'}
                </span>
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="change-reason" label="Motivo">
                <Input
                  id="change-reason"
                  value={reason}
                  maxLength={200}
                  placeholder="Ej. Reducir ruido"
                  onChange={(event) => setReason(event.target.value)}
                  disabled={saving}
                />
              </FormField>
              <FormField id="change-observation" label="Observación">
                <Input
                  id="change-observation"
                  value={observation}
                  maxLength={300}
                  placeholder="Ej. Mejor nitidez nocturna"
                  onChange={(event) => setObservation(event.target.value)}
                  disabled={saving}
                />
              </FormField>
            </div>
          </>
        )}

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
            Registrar cambio
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
