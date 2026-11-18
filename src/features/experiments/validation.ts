import type { ExperimentStatus } from '../../services/types'

/**
 * Validación pura del formulario de experimento.
 */

export type ExperimentFormValues = {
  title: string
  objective: string
  hypothesis: string
  observations: string
  conclusion: string
}

export type ExperimentField = 'title' | 'objective' | 'hypothesis' | 'observations' | 'conclusion'
export type ExperimentFieldErrors = Partial<Record<ExperimentField, string>>

export const EXPERIMENT_LIMITS = {
  title: 120,
  objective: 1000,
  hypothesis: 1000,
  observations: 4000,
  conclusion: 4000,
} as const

export const EMPTY_EXPERIMENT_FORM: ExperimentFormValues = {
  title: '',
  objective: '',
  hypothesis: '',
  observations: '',
  conclusion: '',
}

export const EXPERIMENT_STATUS_OPTIONS: Array<{ value: ExperimentStatus; label: string }> = [
  { value: 'planned', label: 'Planificado' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Completado' },
  { value: 'failed', label: 'Fallido' },
  { value: 'inconclusive', label: 'No concluyente' },
]

export const EXPERIMENT_STATUS_LABEL: Record<ExperimentStatus, string> = {
  planned: 'Planificado',
  in_progress: 'En curso',
  completed: 'Completado',
  failed: 'Fallido',
  inconclusive: 'No concluyente',
}

export const validateExperimentField = (
  field: ExperimentField,
  values: ExperimentFormValues,
): string | undefined => {
  const value = values[field].trim()
  const limit = EXPERIMENT_LIMITS[field]

  if (field === 'title' && value.length === 0) return 'Escribe un título para el experimento.'
  if (value.length > limit) return `Máximo ${limit} caracteres.`
  return undefined
}

export const validateExperimentForm = (values: ExperimentFormValues): ExperimentFieldErrors => {
  const errors: ExperimentFieldErrors = {}
  for (const field of ['title', 'objective', 'hypothesis', 'observations', 'conclusion'] as const) {
    const message = validateExperimentField(field, values)
    if (message) errors[field] = message
  }
  return errors
}
