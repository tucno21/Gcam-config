import { describe, expect, it } from 'vitest'
import { toAppError, AppError } from './AppError'

describe('toAppError', () => {
  it('devuelve el mismo AppError sin envolver', () => {
    const original = new AppError('validation', 'mensaje')
    expect(toAppError(original)).toBe(original)
  })

  it('traduce códigos de PostgreSQL', () => {
    expect(toAppError({ code: '23505', message: 'duplicate' }).code).toBe('conflict')
    expect(toAppError({ code: '23503' }).code).toBe('conflict')
    expect(toAppError({ code: '23514' }).code).toBe('validation')
    expect(toAppError({ code: '42501' }).code).toBe('forbidden')
    expect(toAppError({ code: '42P01' }).code).toBe('config')
    expect(toAppError({ code: 'PGRST205' }).code).toBe('config')
    expect(toAppError({ code: 'PGRST116' }).code).toBe('not_found')
  })

  it('traduce errores de Auth', () => {
    expect(toAppError({ code: 'invalid_credentials' }).code).toBe('unauthorized')
    expect(toAppError({ code: 'user_already_exists' }).code).toBe('conflict')
    expect(toAppError({ code: 'over_email_send_rate_limit' }).code).toBe('rate_limit')
  })

  it('traduce fallos de red y timeouts', () => {
    expect(toAppError({ message: 'Failed to fetch' }).code).toBe('network')
    expect(toAppError({ isAxiosError: true, code: 'ECONNABORTED' }).code).toBe('timeout')
    expect(toAppError({ isAxiosError: true, response: { status: 403 } }).code).toBe('forbidden')
    expect(toAppError({ isAxiosError: true, response: { status: 429 } }).code).toBe('rate_limit')
  })

  it('usa un mensaje genérico para errores desconocidos', () => {
    const error = toAppError(new Error('boom'))
    expect(error.code).toBe('unknown')
    expect(error.message.toLowerCase()).toContain('inesperado')
  })

  it('no expone detalles internos en el mensaje visible', () => {
    const error = toAppError({ code: '23505', message: 'detail: key (slug)=(x) already exists' })
    expect(error.message).not.toContain('slug')
    expect(error.details).toContain('detail')
  })
})
