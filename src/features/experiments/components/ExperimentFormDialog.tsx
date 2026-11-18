import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { Input } from '../../../components/forms/Input'
import { Select } from '../../../components/forms/Select'
import { Textarea } from '../../../components/forms/Textarea'
import { toAppError } from '../../../lib/errors/AppError'
import { experimentService } from '../../../services/experimentService'
import type { Configuration, Experiment, ExperimentStatus } from '../../../services/types'
import {
  EMPTY_EXPERIMENT_FORM,
  EXPERIMENT_STATUS_OPTIONS,
  validateExperimentField,
  validateExperimentForm,
} from '../validation'
import type { ExperimentField, ExperimentFieldErrors, ExperimentFormValues } from '../validation'

type ExperimentFormDialogProps = {
  open: boolean
  /** Perfiles disponibles (solo se usan al crear). */
  profiles: Configuration[]
  /** `null` = nuevo experimento; con valor, edición de metadatos. */
  experiment: Experiment | null
  onClose: () => void
  onSaved: (experiment: Experiment, mode: 'create' | 'edit') => void
}

const toFormValues = (experiment: Experiment | null): ExperimentFormValues =>
  experiment
    ? {
        title: experiment.title,
        objective: experiment.objective ?? '',
        hypothesis: experiment.hypothesis ?? '',
        observations: experiment.observations ?? '',
        conclusion: experiment.conclusion ?? '',
      }
    : EMPTY_EXPERIMENT_FORM

/** Alta y edición de experimentos (metadatos y resultado). */
export const ExperimentFormDialog = ({ open, profiles, experiment, onClose, onSaved }: ExperimentFormDialogProps) => {
  const isEdit = experiment !== null

  const [values, setValues] = useState<ExperimentFormValues>(() => toFormValues(experiment))
  const [configurationId, setConfigurationId] = useState(
    () => experiment?.configurationId ?? profiles.find((profile) => profile.isDefault)?.id ?? profiles[0]?.id ?? '',
  )
  const [status, setStatus] = useState<ExperimentStatus>(() => experiment?.status ?? 'planned')
  const [errors, setErrors] = useState<ExperimentFieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const setField = (field: ExperimentField, value: string) => {
    const next = { ...values, [field]: value }
    setValues(next)
    setErrors((previous) => ({ ...previous, [field]: validateExperimentField(field, next) }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const nextErrors = validateExperimentForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (!isEdit && !configurationId) {
      setFormError('Crea primero un perfil de configuración en esta versión.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: values.title.trim(),
        objective: values.objective.trim() || null,
        hypothesis: values.hypothesis.trim() || null,
        observations: values.observations.trim() || null,
        conclusion: values.conclusion.trim() || null,
      }

      if (isEdit) {
        const saved = await experimentService.update(experiment.id, payload)
        // El estado se sella aparte para gestionar fechas de inicio/fin.
        const withStatus = status !== experiment.status ? await experimentService.setStatus(saved.id, status) : saved
        onSaved(withStatus, 'edit')
      } else {
        const created = await experimentService.create({
          configurationId,
          status,
          ...payload,
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

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={isEdit ? 'Editar experimento' : 'Nuevo experimento'}
      description="Documenta una prueba hecha a mano en el teléfono. La aplicación no aplica cambios en el dispositivo."
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <FormField id="experiment-title" label="Título" error={errors.title} required>
          <Input
            id="experiment-title"
            value={values.title}
            invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'experiment-title-error' : undefined}
            maxLength={120}
            autoComplete="off"
            placeholder="Ej. Probar ISO 100 de noche"
            onChange={(event) => setField('title', event.target.value)}
            onBlur={() => setErrors((previous) => ({ ...previous, title: validateExperimentField('title', values) }))}
            disabled={saving}
          />
        </FormField>

        {!isEdit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="experiment-config" label="Perfil usado" required>
              <Select
                id="experiment-config"
                value={configurationId}
                onChange={(event) => setConfigurationId(event.target.value)}
                disabled={saving || profiles.length === 0}
              >
                {profiles.length === 0 ? (
                  <option value="">Sin perfiles</option>
                ) : (
                  profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                      {profile.isDefault ? ' · predeterminado' : ''}
                    </option>
                  ))
                )}
              </Select>
            </FormField>

            <FormField id="experiment-status" label="Estado">
              <Select
                id="experiment-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as ExperimentStatus)}
                disabled={saving}
              >
                {EXPERIMENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        )}

        {isEdit && (
          <FormField id="experiment-status" label="Estado" hint="Al cerrar se sella la fecha de finalización.">
            <Select
              id="experiment-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ExperimentStatus)}
              disabled={saving}
            >
              {EXPERIMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="experiment-objective" label="Objetivo" error={errors.objective}>
            <Textarea
              id="experiment-objective"
              rows={2}
              value={values.objective}
              invalid={Boolean(errors.objective)}
              aria-describedby={errors.objective ? 'experiment-objective-error' : undefined}
              placeholder="Qué quieres comprobar."
              onChange={(event) => setField('objective', event.target.value)}
              disabled={saving}
            />
          </FormField>

          <FormField id="experiment-hypothesis" label="Hipótesis" error={errors.hypothesis}>
            <Textarea
              id="experiment-hypothesis"
              rows={2}
              value={values.hypothesis}
              invalid={Boolean(errors.hypothesis)}
              aria-describedby={errors.hypothesis ? 'experiment-hypothesis-error' : undefined}
              placeholder="Qué esperas que ocurra."
              onChange={(event) => setField('hypothesis', event.target.value)}
              disabled={saving}
            />
          </FormField>
        </div>

        <FormField id="experiment-observations" label="Observaciones" error={errors.observations}>
          <Textarea
            id="experiment-observations"
            rows={3}
            value={values.observations}
            invalid={Boolean(errors.observations)}
            aria-describedby={errors.observations ? 'experiment-observations-error' : undefined}
            placeholder="Lo que viste en el teléfono."
            onChange={(event) => setField('observations', event.target.value)}
            disabled={saving}
          />
        </FormField>

        <FormField id="experiment-conclusion" label="Conclusión" error={errors.conclusion}>
          <Textarea
            id="experiment-conclusion"
            rows={2}
            value={values.conclusion}
            invalid={Boolean(errors.conclusion)}
            aria-describedby={errors.conclusion ? 'experiment-conclusion-error' : undefined}
            placeholder="Solo cuando tengas una conclusión."
            onChange={(event) => setField('conclusion', event.target.value)}
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
            {isEdit ? 'Guardar cambios' : 'Crear experimento'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
