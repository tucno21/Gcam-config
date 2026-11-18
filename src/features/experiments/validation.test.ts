import { describe, expect, it } from 'vitest'
import { EMPTY_EXPERIMENT_FORM, validateExperimentField, validateExperimentForm } from './validation'
import { validateConfigurationForm } from '../configurations/validation'
import { validateCameraForm } from '../cameras/validation'

describe('validación de experimento', () => {
  it('exige título y respeta el límite', () => {
    expect(validateExperimentField('title', EMPTY_EXPERIMENT_FORM)).toBeTruthy()
    expect(validateExperimentForm({ ...EMPTY_EXPERIMENT_FORM, title: '  ' }).title).toBeTruthy()
    expect(validateExperimentForm({ ...EMPTY_EXPERIMENT_FORM, title: 'Prueba' }).title).toBeUndefined()
    expect(validateExperimentField('objective', { ...EMPTY_EXPERIMENT_FORM, objective: 'x'.repeat(1001) })).toBeTruthy()
  })
})

describe('validación de perfil', () => {
  it('exige nombre y limita la descripción', () => {
    expect(validateConfigurationForm({ name: '', description: '', isDefault: false }).name).toBeTruthy()
    expect(validateConfigurationForm({ name: 'Nocturno', description: '', isDefault: true })).toEqual({})
    expect(validateConfigurationForm({ name: 'A', description: 'x'.repeat(401), isDefault: false }).description).toBeTruthy()
  })
})

describe('validación de cámara', () => {
  const base = {
    name: 'LMC',
    slug: 'lmc-8-4',
    description: '',
    developer: '',
    websiteUrl: '',
    isActive: true,
  }

  it('valida slug, URL y longitudes', () => {
    expect(validateCameraForm({ ...base, slug: 'LMC 8.4' }).slug).toBeTruthy()
    expect(validateCameraForm({ ...base, websiteUrl: 'no-es-url' }).websiteUrl).toBeTruthy()
    expect(validateCameraForm({ ...base, websiteUrl: 'https://ejemplo.com/gcam' }).websiteUrl).toBeUndefined()
    expect(validateCameraForm({ ...base, websiteUrl: 'ftp://ejemplo.com' }).websiteUrl).toBeTruthy()
    expect(validateCameraForm({ ...base, name: '' }).name).toBeTruthy()
  })
})
