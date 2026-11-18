/**
 * Validación pura del formulario de acceso.
 * Devuelve un mapa campo → mensaje; no conoce React ni Supabase.
 */

export type AccessMode = 'signIn' | 'signUp'

export type CredentialsInput = {
  email: string
  password: string
}

export type CredentialsErrors = Partial<Record<'email' | 'password', string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Supabase exige 6 caracteres por defecto; la validación del cliente solo orienta. */
export const MIN_PASSWORD_LENGTH = 6

export const validateCredentials = (input: CredentialsInput, _mode: AccessMode = 'signIn'): CredentialsErrors => {
  const errors: CredentialsErrors = {}
  const email = input.email.trim()

  if (email.length === 0) errors.email = 'Escribe tu correo electrónico.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'El correo no tiene un formato válido.'

  if (input.password.length === 0) errors.password = 'Escribe tu contraseña.'
  else if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }

  return errors
}
