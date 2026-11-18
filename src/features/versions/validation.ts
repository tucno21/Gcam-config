/**
 * Validación pura del formulario de versión.
 * La base garantiza `unique (camera_id, version)`; aquí solo orientamos.
 */

export type VersionFormValues = {
  version: string
  releaseLabel: string
  notes: string
  isDefault: boolean
}

export type VersionField = 'version' | 'releaseLabel' | 'notes'

export type VersionFieldErrors = Partial<Record<VersionField, string>>

export const VERSION_FIELD_LIMITS = {
  version: 40,
  releaseLabel: 60,
  notes: 500,
} as const

export const EMPTY_VERSION_FORM: VersionFormValues = {
  version: '',
  releaseLabel: '',
  notes: '',
  isDefault: false,
}

export const validateVersionField = (field: VersionField, values: VersionFormValues): string | undefined => {
  const value = values[field].trim()

  switch (field) {
    case 'version':
      if (value.length === 0) return 'Escribe la etiqueta de la versión.'
      if (value.length > VERSION_FIELD_LIMITS.version) return `Máximo ${VERSION_FIELD_LIMITS.version} caracteres.`
      return undefined

    case 'releaseLabel':
      if (value.length > VERSION_FIELD_LIMITS.releaseLabel) {
        return `Máximo ${VERSION_FIELD_LIMITS.releaseLabel} caracteres.`
      }
      return undefined

    case 'notes':
      if (value.length > VERSION_FIELD_LIMITS.notes) return `Máximo ${VERSION_FIELD_LIMITS.notes} caracteres.`
      return undefined
  }
}

export const validateVersionForm = (values: VersionFormValues): VersionFieldErrors => {
  const errors: VersionFieldErrors = {}
  for (const field of ['version', 'releaseLabel', 'notes'] as const) {
    const message = validateVersionField(field, values)
    if (message) errors[field] = message
  }
  return errors
}

export const toVersionInput = (values: VersionFormValues) => ({
  version: values.version.trim(),
  releaseLabel: values.releaseLabel.trim() || null,
  notes: values.notes.trim() || null,
  isDefault: values.isDefault,
})
