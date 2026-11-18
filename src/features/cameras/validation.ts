/**
 * Validación pura del formulario de cámara.
 * Devuelve un mapa campo → mensaje; no conoce React ni los servicios.
 *
 * La base valida de nuevo (`unique (owner_id, slug)` y el `CHECK` del slug):
 * esta validación solo orienta al usuario antes de enviar.
 */

export type CameraFormValues = {
  name: string
  slug: string
  description: string
  developer: string
  websiteUrl: string
  isActive: boolean
}

export type CameraField = 'name' | 'slug' | 'description' | 'developer' | 'websiteUrl'

export type CameraFieldErrors = Partial<Record<CameraField, string>>

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const CAMERA_FIELD_LIMITS = {
  name: 100,
  slug: 60,
  description: 500,
  developer: 80,
  websiteUrl: 300,
} as const

export const EMPTY_CAMERA_FORM: CameraFormValues = {
  name: '',
  slug: '',
  description: '',
  developer: '',
  websiteUrl: '',
  isActive: true,
}

export const validateCameraField = (field: CameraField, values: CameraFormValues): string | undefined => {
  const value = values[field].trim()

  switch (field) {
    case 'name':
      if (value.length === 0) return 'Escribe el nombre de la cámara.'
      if (value.length > CAMERA_FIELD_LIMITS.name) return `Máximo ${CAMERA_FIELD_LIMITS.name} caracteres.`
      return undefined

    case 'slug':
      if (value.length === 0) return 'Escribe el identificador (slug).'
      if (!SLUG_PATTERN.test(value)) return 'Solo minúsculas, números y guiones (ej. lmc-8-4).'
      if (value.length > CAMERA_FIELD_LIMITS.slug) return `Máximo ${CAMERA_FIELD_LIMITS.slug} caracteres.`
      return undefined

    case 'description':
      if (value.length > CAMERA_FIELD_LIMITS.description) {
        return `Máximo ${CAMERA_FIELD_LIMITS.description} caracteres.`
      }
      return undefined

    case 'developer':
      if (value.length > CAMERA_FIELD_LIMITS.developer) {
        return `Máximo ${CAMERA_FIELD_LIMITS.developer} caracteres.`
      }
      return undefined

    case 'websiteUrl':
      if (value.length === 0) return undefined
      if (value.length > CAMERA_FIELD_LIMITS.websiteUrl) {
        return `Máximo ${CAMERA_FIELD_LIMITS.websiteUrl} caracteres.`
      }
      try {
        const url = new URL(value)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'El enlace debe ser http o https.'
      } catch {
        return 'Escribe un enlace completo, ej. https://ejemplo.com.'
      }
      return undefined
  }
}

export const validateCameraForm = (values: CameraFormValues): CameraFieldErrors => {
  const errors: CameraFieldErrors = {}
  for (const field of ['name', 'slug', 'description', 'developer', 'websiteUrl'] as const) {
    const message = validateCameraField(field, values)
    if (message) errors[field] = message
  }
  return errors
}

/** Valores listos para el servicio: recortados y con vacíos convertidos en null. */
export const toCameraInput = (values: CameraFormValues) => ({
  name: values.name.trim(),
  slug: values.slug.trim(),
  description: values.description.trim() || null,
  developer: values.developer.trim() || null,
  websiteUrl: values.websiteUrl.trim() || null,
  isActive: values.isActive,
})
