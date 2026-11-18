/**
 * Validación pura del formulario de perfil.
 * La base garantiza `unique (camera_version_id, name)`; aquí solo orientamos.
 */

export type ConfigurationFormValues = {
  name: string
  description: string
  isDefault: boolean
}

export type ConfigurationField = 'name' | 'description'
export type ConfigurationFieldErrors = Partial<Record<ConfigurationField, string>>

export const CONFIGURATION_FIELD_LIMITS = { name: 80, description: 400 } as const

export const EMPTY_CONFIGURATION_FORM: ConfigurationFormValues = {
  name: '',
  description: '',
  isDefault: false,
}

export const validateConfigurationField = (
  field: ConfigurationField,
  values: ConfigurationFormValues,
): string | undefined => {
  const value = values[field].trim()
  switch (field) {
    case 'name':
      if (value.length === 0) return 'Escribe el nombre del perfil.'
      if (value.length > CONFIGURATION_FIELD_LIMITS.name) return `Máximo ${CONFIGURATION_FIELD_LIMITS.name} caracteres.`
      return undefined
    case 'description':
      if (value.length > CONFIGURATION_FIELD_LIMITS.description) {
        return `Máximo ${CONFIGURATION_FIELD_LIMITS.description} caracteres.`
      }
      return undefined
  }
}

export const validateConfigurationForm = (values: ConfigurationFormValues): ConfigurationFieldErrors => {
  const errors: ConfigurationFieldErrors = {}
  for (const field of ['name', 'description'] as const) {
    const message = validateConfigurationField(field, values)
    if (message) errors[field] = message
  }
  return errors
}

export const toConfigurationInput = (values: ConfigurationFormValues) => ({
  name: values.name.trim(),
  description: values.description.trim() || null,
  isDefault: values.isDefault,
})
