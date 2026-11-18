import { describe, expect, it } from 'vitest'
import type { CameraBackup } from './exportSchema'
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  parseJsonText,
  summarizeBackup,
  validateCameraBackup,
} from './exportSchema'

const baseNode = { id: 'n1', parentId: null, name: 'Base', nodeType: 'category' as const, sortOrder: 0, description: null }

const validBackup = (): CameraBackup => ({
  format: BACKUP_FORMAT,
  schemaVersion: BACKUP_SCHEMA_VERSION,
  exportedAt: '2026-11-18T10:00:00Z',
  camera: { name: 'Prueba', slug: 'prueba', description: null, developer: null, websiteUrl: null, isActive: true },
  versions: [
    {
      version: '1.0',
      releaseLabel: null,
      notes: null,
      isDefault: true,
      isActive: true,
      nodes: [baseNode],
      parameters: [
        {
          id: 'p1',
          nodeId: 'n1',
          key: 'max_frames',
          name: 'Max Frames',
          description: null,
          dataType: 'integer',
          unit: 'f',
          defaultValue: 10,
          defaultValueSource: 'documentation',
          defaultValueConfidence: 'high',
          allowedValues: null,
          sortOrder: 0,
          isActive: true,
        },
      ],
      configurations: [
        {
          id: 'c1',
          name: 'Nocturno',
          description: null,
          isDefault: true,
          isActive: true,
          values: [{ parameterId: 'p1', value: 20, notes: null }],
        },
      ],
      experiments: [
        {
          id: 'e1',
          configurationId: 'c1',
          title: 'Prueba',
          objective: null,
          hypothesis: null,
          status: 'completed',
          observations: null,
          conclusion: null,
          startedAt: null,
          completedAt: null,
          changes: [
            {
              parameterId: 'p1',
              previousValue: 10,
              newValue: 20,
              reason: null,
              observation: null,
              pathSnapshot: ['Base'],
              appliedToProfile: true,
            },
          ],
        },
      ],
    },
  ],
})

describe('validateCameraBackup', () => {
  it('acepta un respaldo válido y resume sus datos', () => {
    const result = validateCameraBackup(validBackup())
    expect(result.errors).toEqual([])
    expect(result.data?.camera.slug).toBe('prueba')
    const summary = summarizeBackup(result.data!)
    expect(summary).toMatchObject({ versions: 1, nodes: 1, parameters: 1, configurations: 1, values: 1, experiments: 1, changes: 1 })
  })

  it('rechaza formatos y versiones de esquema desconocidos', () => {
    expect(validateCameraBackup({ format: 'otro' }).errors[0]).toMatch(/Formato/)
    expect(validateCameraBackup({ ...validBackup(), schemaVersion: 99 }).errors[0]).toMatch(/esquema/)
  })

  it('detecta referencias rotas y duplicados internos', () => {
    const broken = validBackup()
    broken.versions[0].parameters[0].nodeId = 'nodo-inexistente'
    expect(validateCameraBackup(broken).errors.some((error) => error.includes('nodo inexistente'))).toBe(true)

    const duplicateKey = validBackup()
    duplicateKey.versions[0].parameters.push({ ...duplicateKey.versions[0].parameters[0], id: 'p2' })
    expect(validateCameraBackup(duplicateKey).errors.some((error) => error.includes('clave'))).toBe(true)

    const duplicateDefault = validBackup()
    duplicateDefault.versions[0].configurations.push({ ...duplicateDefault.versions[0].configurations[0], id: 'c2', name: 'Otro', isDefault: true })
    expect(validateCameraBackup(duplicateDefault).errors.some((error) => error.includes('predeterminado'))).toBe(true)
  })

  it('detecta valores con parámetros ajenos y experimentos con perfiles ajenos', () => {
    const badValue = validBackup()
    badValue.versions[0].configurations[0].values[0].parameterId = 'no-existe'
    expect(validateCameraBackup(badValue).errors.some((error) => error.includes('parámetro inexistente'))).toBe(true)

    const badExperiment = validBackup()
    badExperiment.versions[0].experiments[0].configurationId = 'no-existe'
    expect(validateCameraBackup(badExperiment).errors.some((error) => error.includes('perfil inexistente'))).toBe(true)
  })

  it('valida el texto JSON antes de analizarlo', () => {
    expect(parseJsonText('{ roto').errors[0]).toMatch(/JSON/)
    expect(parseJsonText(JSON.stringify(validBackup())).errors).toEqual([])
  })

  it('acepta los campos del espejo de ajustes (linaje, valor actual e historial)', () => {
    const backup = validBackup()
    backup.versions[0].nodes[0] = { ...backup.versions[0].nodes[0], lineageId: 'L-n1', isActive: true }
    backup.versions[0].parameters[0] = {
      ...backup.versions[0].parameters[0],
      lineageId: 'L-p1',
      notes: 'Sube la nitidez y el ruido.',
      currentValue: 1.375,
      currentValueSource: 'custom',
    }
    backup.versions[0].history = [
      {
        parameterId: 'p1',
        previousValue: 1.25,
        previousValueSource: 'custom',
        newValue: 1.375,
        newValueSource: 'custom',
        reason: 'Recuperar detalle',
        observation: null,
        effect: 'better',
        pathSnapshot: ['Base'],
        appliedToProfile: true,
      },
    ]

    const result = validateCameraBackup(backup)
    expect(result.errors).toEqual([])
    expect(result.data?.versions[0].parameters[0].notes).toContain('nitidez')
    expect(result.data?.versions[0].parameters[0].currentValueSource).toBe('custom')
    expect(result.data?.versions[0].history?.[0].effect).toBe('better')
    expect(summarizeBackup(result.data!).changes).toBe(2)
  })
})
