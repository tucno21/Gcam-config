import { describe, expect, it } from 'vitest'
import { slugify } from './slugify'
import { backupFilename } from './downloadJson'
import { formatDate, formatDateTime } from './formatDate'
import { shortId } from './shortId'

describe('slugify', () => {
  it('genera slugs válidos según el CHECK de la base', () => {
    expect(slugify('LMC 8.4')).toBe('lmc-8-4')
    expect(slugify('  Configuración Añadida  ')).toBe('configuracion-anadida')
    expect(slugify('AGC---v9')).toBe('agc-v9')
    expect(slugify('X')).toBe('x')
  })

  it('recorta a 60 caracteres y no deja guiones en los extremos', () => {
    const result = slugify('-'.repeat(3) + 'a'.repeat(80))
    expect(result.length).toBeLessThanOrEqual(60)
    expect(result.startsWith('-')).toBe(false)
    expect(result.endsWith('-')).toBe(false)
  })
})

describe('formatDate', () => {
  it('formatea fechas ISO y trata valores vacíos o inválidos', () => {
    expect(formatDate('2026-11-18T10:00:00.000Z')).toMatch(/2026/)
    expect(formatDate(null)).toBe('—')
    expect(formatDate('no-es-fecha')).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
  })
})

describe('shortId', () => {
  it('recorta identificadores largos sin romper los cortos', () => {
    expect(shortId('abcdefgh-1234-5678')).toBe('abcdefgh')
    expect(shortId('corto')).toBe('corto')
    expect(shortId(undefined)).toBe('—')
  })
})

describe('backupFilename', () => {
  it('incluye slug, sufijo y fecha', () => {
    const name = backupFilename('lmc-8-4', '-nocturno')
    expect(name).toMatch(/^gcam-lmc-8-4-nocturno-\d{4}-\d{2}-\d{2}\.json$/)
  })
})
