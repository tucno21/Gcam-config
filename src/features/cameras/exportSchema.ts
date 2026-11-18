import { CURRENT_VALUE_SOURCES } from '../../services/types'
import type {
  DataType,
  DefaultValueSource,
  ConfidenceLevel,
  CurrentValueSource,
  ChangeEffect,
  ExperimentStatus,
  NodeType,
} from '../../services/types'

/**
 * Formato propio de respaldo (D-034).
 *
 * `schemaVersion` permite evolucionar el formato sin romper importaciones.
 * La validación comprueba la forma, los límites, los duplicados internos y la
 * integridad de las referencias (nodo → parámetro → perfil → experimento), para
 * que una importación nunca deje relaciones huérfanas.
 */

export const BACKUP_FORMAT = 'gcam-camera-backup'
export const BACKUP_SCHEMA_VERSION = 1
export const PROFILE_FORMAT = 'gcam-profile-backup'

export type BackupNode = {
  id: string
  parentId: string | null
  name: string
  description: string | null
  nodeType: NodeType
  sortOrder: number
  /** Identidad entre versiones (opcional en respaldos antiguos). */
  lineageId?: string
  isActive?: boolean
  createdAt?: string
}

export type BackupParameter = {
  id: string
  nodeId: string
  key: string | null
  name: string
  description: string | null
  notes?: string | null
  dataType: DataType
  unit: string | null
  defaultValue: unknown
  defaultValueSource: DefaultValueSource
  defaultValueConfidence: ConfidenceLevel | null
  allowedValues: string[] | null
  currentValue?: unknown
  currentValueSource?: CurrentValueSource
  lineageId?: string
  sortOrder: number
  isActive: boolean
  createdAt?: string
}

export type BackupValue = {
  parameterId: string
  value: unknown
  notes: string | null
}

export type BackupConfiguration = {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  isActive: boolean
  createdAt?: string
  values: BackupValue[]
}

export type BackupChange = {
  parameterId: string
  previousValue: unknown
  previousValueSource?: CurrentValueSource | null
  newValue: unknown
  newValueSource?: CurrentValueSource | null
  reason: string | null
  observation: string | null
  effect?: ChangeEffect | null
  pathSnapshot: string[] | null
  appliedToProfile: boolean
  createdAt?: string
}

export type BackupExperiment = {
  id: string
  configurationId: string
  title: string
  objective: string | null
  hypothesis: string | null
  status: ExperimentStatus
  observations: string | null
  conclusion: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt?: string
  changes: BackupChange[]
}

export type BackupVersion = {
  version: string
  releaseLabel: string | null
  notes: string | null
  isDefault: boolean
  isActive: boolean
  createdAt?: string
  nodes: BackupNode[]
  parameters: BackupParameter[]
  configurations: BackupConfiguration[]
  experiments: BackupExperiment[]
  /** Cambios de valor sueltos (historial del espejo de ajustes). */
  history?: BackupChange[]
}

export type CameraBackup = {
  format: typeof BACKUP_FORMAT
  schemaVersion: typeof BACKUP_SCHEMA_VERSION
  exportedAt: string
  camera: {
    name: string
    slug: string
    description: string | null
    developer: string | null
    websiteUrl: string | null
    isActive: boolean
  }
  versions: BackupVersion[]
}

export type ProfileBackup = {
  format: typeof PROFILE_FORMAT
  schemaVersion: typeof BACKUP_SCHEMA_VERSION
  exportedAt: string
  context: {
    cameraName: string
    cameraSlug: string
    versionLabel: string
  }
  configuration: BackupConfiguration
  /** Definiciones de los parámetros referenciados (ruta incluida). */
  parameters: Array<BackupParameter & { path: string[] }>
  /** Los valores igual que en `configuration.values` (comodidad de lectura). */
  values: BackupValue[]
}

export type ValidationResult<T> = { data: T | null; errors: string[] }

const MAX_VERSIONS = 20
const MAX_NODES = 5_000
const MAX_PARAMETERS = 5_000
const MAX_CONFIGURATIONS = 100
const MAX_VALUES = 10_000
const MAX_EXPERIMENTS = 500
const MAX_CHANGES = 5_000

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isText = (value: unknown): value is string => typeof value === 'string'
const isNullableText = (value: unknown): value is string | null => value === null || typeof value === 'string'
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value)

const NODE_TYPES = ['category', 'group', 'subgroup'] as const
const DATA_TYPES = ['integer', 'decimal', 'boolean', 'string', 'enum', 'json'] as const
const SOURCES = ['documentation', 'original_file', 'observation', 'unknown'] as const
const CONFIDENCES = ['low', 'medium', 'high'] as const
const STATUSES = ['planned', 'in_progress', 'completed', 'failed', 'inconclusive'] as const
const EFFECTS = ['better', 'same', 'worse', 'unknown'] as const

const isOneOf = <T extends readonly string[]>(list: T, value: unknown): value is T[number] =>
  typeof value === 'string' && (list as readonly string[]).includes(value)

export const parseJsonText = (text: string): ValidationResult<unknown> => {
  try {
    return { data: JSON.parse(text) as unknown, errors: [] }
  } catch (error) {
    return { data: null, errors: [`El archivo no es JSON válido: ${error instanceof Error ? error.message : 'error'}`] }
  }
}

const validateNode = (raw: unknown, index: number, errors: string[]): BackupNode | null => {
  const where = `versions[n].nodes[${index}]`
  if (!isObject(raw)) {
    errors.push(`${where}: cada nodo debe ser un objeto.`)
    return null
  }
  if (!isText(raw.id) || !isText(raw.name)) {
    errors.push(`${where}: faltan «id» o «name».`)
    return null
  }
  if (!isNullableText(raw.parentId) || !isOneOf(NODE_TYPES, raw.nodeType) || !isInteger(raw.sortOrder)) {
    errors.push(`${where}: parentId, nodeType o sortOrder no válidos.`)
    return null
  }
  return {
    id: raw.id,
    parentId: raw.parentId,
    name: raw.name,
    description: isNullableText(raw.description) ? raw.description : null,
    nodeType: raw.nodeType,
    sortOrder: raw.sortOrder,
    lineageId: isText(raw.lineageId) ? raw.lineageId : undefined,
    isActive: isBoolean(raw.isActive) ? raw.isActive : true,
    createdAt: isText(raw.createdAt) ? raw.createdAt : undefined,
  }
}

const validateParameter = (raw: unknown, index: number, errors: string[]): BackupParameter | null => {
  const where = `versions[n].parameters[${index}]`
  if (!isObject(raw) || !isText(raw.id) || !isText(raw.nodeId) || !isText(raw.name)) {
    errors.push(`${where}: faltan «id», «nodeId» o «name».`)
    return null
  }
  if (!isOneOf(DATA_TYPES, raw.dataType)) {
    errors.push(`${where}: «dataType» no válido.`)
    return null
  }
  if (!isOneOf(SOURCES, raw.defaultValueSource)) {
    errors.push(`${where}: «defaultValueSource» no válido.`)
    return null
  }
  if (raw.defaultValueConfidence !== null && raw.defaultValueConfidence !== undefined && !isOneOf(CONFIDENCES, raw.defaultValueConfidence)) {
    errors.push(`${where}: «defaultValueConfidence» no válido.`)
    return null
  }
  if (raw.allowedValues !== null && raw.allowedValues !== undefined && !Array.isArray(raw.allowedValues)) {
    errors.push(`${where}: «allowedValues» debe ser un array o null.`)
    return null
  }

  return {
    id: raw.id,
    nodeId: raw.nodeId,
    key: isNullableText(raw.key) ? raw.key : null,
    name: raw.name,
    description: isNullableText(raw.description) ? raw.description : null,
    notes: isNullableText(raw.notes) ? raw.notes : null,
    dataType: raw.dataType,
    unit: isNullableText(raw.unit) ? raw.unit : null,
    defaultValue: raw.defaultValue ?? null,
    defaultValueSource: raw.defaultValueSource,
    defaultValueConfidence:
      raw.defaultValueConfidence === undefined ? null : (raw.defaultValueConfidence as ConfidenceLevel | null),
    allowedValues: Array.isArray(raw.allowedValues) ? (raw.allowedValues as unknown[]).map(String) : null,
    currentValue: raw.currentValue ?? null,
    currentValueSource:
      raw.currentValueSource === undefined || !isOneOf(CURRENT_VALUE_SOURCES, raw.currentValueSource)
        ? 'unknown'
        : raw.currentValueSource,
    lineageId: isText(raw.lineageId) ? raw.lineageId : undefined,
    sortOrder: isInteger(raw.sortOrder) ? raw.sortOrder : 0,
    isActive: isBoolean(raw.isActive) ? raw.isActive : true,
    createdAt: isText(raw.createdAt) ? raw.createdAt : undefined,
  }
}

const validateValue = (raw: unknown, index: number, errors: string[]): BackupValue | null => {
  const where = `versions[n].configurations[].values[${index}]`
  if (!isObject(raw) || !isText(raw.parameterId) || raw.value === undefined) {
    errors.push(`${where}: cada valor necesita «parameterId» y «value».`)
    return null
  }
  return {
    parameterId: raw.parameterId,
    value: raw.value,
    notes: isNullableText(raw.notes) ? raw.notes : null,
  }
}

const validateChange = (raw: unknown, index: number, errors: string[]): BackupChange | null => {
  const where = `versions[n].experiments[].changes[${index}]`
  if (!isObject(raw) || !isText(raw.parameterId) || raw.newValue === undefined) {
    errors.push(`${where}: cada cambio necesita «parameterId» y «newValue».`)
    return null
  }
  if (!isBoolean(raw.appliedToProfile)) {
    errors.push(`${where}: falta «appliedToProfile».`)
    return null
  }
  return {
    parameterId: raw.parameterId,
    previousValue: raw.previousValue ?? null,
    previousValueSource:
      raw.previousValueSource === undefined || raw.previousValueSource === null
        ? null
        : isOneOf(CURRENT_VALUE_SOURCES, raw.previousValueSource)
          ? raw.previousValueSource
          : null,
    newValue: raw.newValue,
    newValueSource:
      raw.newValueSource === undefined || raw.newValueSource === null
        ? null
        : isOneOf(CURRENT_VALUE_SOURCES, raw.newValueSource)
          ? raw.newValueSource
          : null,
    reason: isNullableText(raw.reason) ? raw.reason : null,
    observation: isNullableText(raw.observation) ? raw.observation : null,
    effect:
      raw.effect === undefined || raw.effect === null || !isOneOf(EFFECTS, raw.effect) ? null : raw.effect,
    pathSnapshot: Array.isArray(raw.pathSnapshot) ? (raw.pathSnapshot as unknown[]).map(String) : null,
    appliedToProfile: raw.appliedToProfile,
    createdAt: isText(raw.createdAt) ? raw.createdAt : undefined,
  }
}

const validateExperiment = (raw: unknown, index: number, errors: string[]): BackupExperiment | null => {
  const where = `versions[n].experiments[${index}]`
  if (!isObject(raw) || !isText(raw.id) || !isText(raw.configurationId) || !isText(raw.title)) {
    errors.push(`${where}: faltan «id», «configurationId» o «title».`)
    return null
  }
  if (!isOneOf(STATUSES, raw.status)) {
    errors.push(`${where}: «status» no válido.`)
    return null
  }
  if (raw.changes !== undefined && !Array.isArray(raw.changes)) {
    errors.push(`${where}: «changes» debe ser un array.`)
    return null
  }

  return {
    id: raw.id,
    configurationId: raw.configurationId,
    title: raw.title,
    objective: isNullableText(raw.objective) ? raw.objective : null,
    hypothesis: isNullableText(raw.hypothesis) ? raw.hypothesis : null,
    status: raw.status,
    observations: isNullableText(raw.observations) ? raw.observations : null,
    conclusion: isNullableText(raw.conclusion) ? raw.conclusion : null,
    startedAt: isNullableText(raw.startedAt) ? raw.startedAt : null,
    completedAt: isNullableText(raw.completedAt) ? raw.completedAt : null,
    createdAt: isText(raw.createdAt) ? raw.createdAt : undefined,
    changes: Array.isArray(raw.changes)
      ? (raw.changes as unknown[]).map((change, changeIndex) => validateChange(change, changeIndex, errors)).filter((change): change is BackupChange => change !== null)
      : [],
  }
}

const validateConfiguration = (raw: unknown, index: number, errors: string[]): BackupConfiguration | null => {
  const where = `versions[n].configurations[${index}]`
  if (!isObject(raw) || !isText(raw.id) || !isText(raw.name)) {
    errors.push(`${where}: faltan «id» o «name».`)
    return null
  }
  if (raw.values !== undefined && !Array.isArray(raw.values)) {
    errors.push(`${where}: «values» debe ser un array.`)
    return null
  }
  return {
    id: raw.id,
    name: raw.name,
    description: isNullableText(raw.description) ? raw.description : null,
    isDefault: isBoolean(raw.isDefault) ? raw.isDefault : false,
    isActive: isBoolean(raw.isActive) ? raw.isActive : true,
    createdAt: isText(raw.createdAt) ? raw.createdAt : undefined,
    values: Array.isArray(raw.values)
      ? (raw.values as unknown[]).map((value, valueIndex) => validateValue(value, valueIndex, errors)).filter((value): value is BackupValue => value !== null)
      : [],
  }
}

const validateVersion = (raw: unknown, index: number, errors: string[]): BackupVersion | null => {
  const where = `versions[${index}]`
  if (!isObject(raw) || !isText(raw.version)) {
    errors.push(`${where}: falta «version».`)
    return null
  }
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.parameters) || !Array.isArray(raw.configurations)) {
    errors.push(`${where}: faltan arrays «nodes», «parameters» o «configurations».`)
    return null
  }
  if (raw.experiments !== undefined && !Array.isArray(raw.experiments)) {
    errors.push(`${where}: «experiments» debe ser un array.`)
    return null
  }

  return {
    version: raw.version,
    releaseLabel: isNullableText(raw.releaseLabel) ? raw.releaseLabel : null,
    notes: isNullableText(raw.notes) ? raw.notes : null,
    isDefault: isBoolean(raw.isDefault) ? raw.isDefault : false,
    isActive: isBoolean(raw.isActive) ? raw.isActive : true,
    createdAt: isText(raw.createdAt) ? raw.createdAt : undefined,
    nodes: (raw.nodes as unknown[]).map((node, nodeIndex) => validateNode(node, nodeIndex, errors)).filter((node): node is BackupNode => node !== null),
    parameters: (raw.parameters as unknown[]).map((parameter, parameterIndex) => validateParameter(parameter, parameterIndex, errors)).filter((parameter): parameter is BackupParameter => parameter !== null),
    configurations: (raw.configurations as unknown[])
      .map((configuration, configurationIndex) => validateConfiguration(configuration, configurationIndex, errors))
      .filter((configuration): configuration is BackupConfiguration => configuration !== null),
    experiments: Array.isArray(raw.experiments)
      ? (raw.experiments as unknown[])
          .map((experiment, experimentIndex) => validateExperiment(experiment, experimentIndex, errors))
          .filter((experiment): experiment is BackupExperiment => experiment !== null)
      : [],
    history: Array.isArray(raw.history)
      ? (raw.history as unknown[])
          .map((change, changeIndex) => validateChange(change, changeIndex, errors))
          .filter((change): change is BackupChange => change !== null)
      : [],
  }
}

/** Comprueba referencias y duplicados internos de una versión. */
const validateVersionIntegrity = (version: BackupVersion, versionIndex: number, errors: string[]): void => {
  const where = `versions[${versionIndex}]`
  const nodeIds = new Set(version.nodes.map((node) => node.id))
  const parameterIds = new Set(version.parameters.map((parameter) => parameter.id))
  const configurationIds = new Set(version.configurations.map((configuration) => configuration.id))

  for (const node of version.nodes) {
    if (node.parentId !== null && !nodeIds.has(node.parentId)) {
      errors.push(`${where}: el nodo «${node.name}» apunta a un padre inexistente.`)
    }
    if (node.parentId === node.id) errors.push(`${where}: el nodo «${node.name}» es su propio padre.`)
  }

  const siblingNames = new Set<string>()
  for (const node of version.nodes) {
    const key = `${node.parentId ?? 'root'}::${node.name.toLowerCase()}`
    if (siblingNames.has(key)) errors.push(`${where}: dos nodos hermanos se llaman «${node.name}».`)
    siblingNames.add(key)
  }

  const keys = new Set<string>()
  for (const parameter of version.parameters) {
    if (!nodeIds.has(parameter.nodeId)) {
      errors.push(`${where}: el parámetro «${parameter.name}» apunta a un nodo inexistente.`)
    }
    if (parameter.key) {
      const key = `${parameter.nodeId}::${parameter.key}`
      if (keys.has(key)) errors.push(`${where}: clave «${parameter.key}» repetida en el mismo nodo.`)
      keys.add(key)
    }
  }

  const configurationNames = new Set<string>()
  for (const configuration of version.configurations) {
    const name = configuration.name.toLowerCase()
    if (configurationNames.has(name)) errors.push(`${where}: dos perfiles se llaman «${configuration.name}».`)
    configurationNames.add(name)

    const valueParameters = new Set<string>()
    for (const value of configuration.values) {
      if (!parameterIds.has(value.parameterId)) {
        errors.push(`${where}: el perfil «${configuration.name}» usa un parámetro inexistente.`)
      }
      if (valueParameters.has(value.parameterId)) {
        errors.push(`${where}: el perfil «${configuration.name}» repite un parámetro.`)
      }
      valueParameters.add(value.parameterId)
    }
  }

  const experimentIds = new Set<string>()
  for (const experiment of version.experiments) {
    if (!configurationIds.has(experiment.configurationId)) {
      errors.push(`${where}: el experimento «${experiment.title}» apunta a un perfil inexistente.`)
    }
    if (experimentIds.has(experiment.id)) errors.push(`${where}: experimento duplicado «${experiment.title}».`)
    experimentIds.add(experiment.id)

    for (const change of experiment.changes) {
      if (!parameterIds.has(change.parameterId)) {
        errors.push(`${where}: el experimento «${experiment.title}» registra un cambio de un parámetro inexistente.`)
      }
    }
  }

  const defaults = version.configurations.filter((configuration) => configuration.isDefault).length
  if (defaults > 1) errors.push(`${where}: hay más de un perfil predeterminado.`)
}

/** Valida un respaldo de cámara completo. */
export const validateCameraBackup = (raw: unknown): ValidationResult<CameraBackup> => {
  const errors: string[] = []
  if (!isObject(raw)) return { data: null, errors: ['El archivo no contiene un objeto JSON.'] }
  if (raw.format !== BACKUP_FORMAT) {
    return { data: null, errors: [`Formato no reconocido. Se esperaba «${BACKUP_FORMAT}».`] }
  }
  if (raw.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return {
      data: null,
      errors: [`Versión de esquema no soportada (${String(raw.schemaVersion)}). Esta app importa la versión ${BACKUP_SCHEMA_VERSION}.`],
    }
  }
  if (!isObject(raw.camera) || !isText(raw.camera.name) || !isText(raw.camera.slug)) {
    errors.push('Falta la cámara o sus campos «name»/«slug».')
  }
  if (!Array.isArray(raw.versions)) {
    return { data: null, errors: [...errors, 'Falta el array «versions».'] }
  }
  if (raw.versions.length === 0) errors.push('El respaldo no contiene ninguna versión.')
  if (raw.versions.length > MAX_VERSIONS) errors.push(`Máximo ${MAX_VERSIONS} versiones por respaldo.`)

  const versions = (raw.versions as unknown[])
    .map((version, index) => validateVersion(version, index, errors))
    .filter((version): version is BackupVersion => version !== null)

  let nodeTotal = 0
  let parameterTotal = 0
  let configurationTotal = 0
  let valueTotal = 0
  let experimentTotal = 0
  let changeTotal = 0

  versions.forEach((version, index) => {
    nodeTotal += version.nodes.length
    parameterTotal += version.parameters.length
    configurationTotal += version.configurations.length
    valueTotal += version.configurations.reduce((total, configuration) => total + configuration.values.length, 0)
    experimentTotal += version.experiments.length
    changeTotal += version.experiments.reduce((total, experiment) => total + experiment.changes.length, 0)
    validateVersionIntegrity(version, index, errors)
  })

  if (nodeTotal > MAX_NODES) errors.push(`Máximo ${MAX_NODES} nodos por respaldo.`)
  if (parameterTotal > MAX_PARAMETERS) errors.push(`Máximo ${MAX_PARAMETERS} parámetros por respaldo.`)
  if (configurationTotal > MAX_CONFIGURATIONS) errors.push(`Máximo ${MAX_CONFIGURATIONS} perfiles por respaldo.`)
  if (valueTotal > MAX_VALUES) errors.push(`Máximo ${MAX_VALUES} valores por respaldo.`)
  if (experimentTotal > MAX_EXPERIMENTS) errors.push(`Máximo ${MAX_EXPERIMENTS} experimentos por respaldo.`)
  if (changeTotal > MAX_CHANGES) errors.push(`Máximo ${MAX_CHANGES} cambios de historial por respaldo.`)

  const labels = new Set<string>()
  for (const version of versions) {
    if (labels.has(version.version)) errors.push(`Etiqueta de versión duplicada: «${version.version}».`)
    labels.add(version.version)
  }

  if (errors.length > 0) return { data: null, errors }

  return {
    data: {
      format: BACKUP_FORMAT,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: isText(raw.exportedAt) ? raw.exportedAt : new Date().toISOString(),
      camera: {
        name: (raw.camera as Record<string, unknown>).name as string,
        slug: (raw.camera as Record<string, unknown>).slug as string,
        description: isNullableText((raw.camera as Record<string, unknown>).description)
          ? ((raw.camera as Record<string, unknown>).description as string | null)
          : null,
        developer: isNullableText((raw.camera as Record<string, unknown>).developer)
          ? ((raw.camera as Record<string, unknown>).developer as string | null)
          : null,
        websiteUrl: isNullableText((raw.camera as Record<string, unknown>).websiteUrl)
          ? ((raw.camera as Record<string, unknown>).websiteUrl as string | null)
          : null,
        isActive: isBoolean((raw.camera as Record<string, unknown>).isActive)
          ? ((raw.camera as Record<string, unknown>).isActive as boolean)
          : true,
      },
      versions,
    },
    errors: [],
  }
}

export type BackupSummary = {
  cameraName: string
  versions: number
  nodes: number
  parameters: number
  configurations: number
  values: number
  experiments: number
  changes: number
  hasExperiments: boolean
}

export const summarizeBackup = (backup: CameraBackup): BackupSummary => {
  let nodes = 0
  let parameters = 0
  let configurations = 0
  let values = 0
  let experiments = 0
  let changes = 0

  for (const version of backup.versions) {
    nodes += version.nodes.length
    parameters += version.parameters.length
    configurations += version.configurations.length
    values += version.configurations.reduce((total, configuration) => total + configuration.values.length, 0)
    experiments += version.experiments.length
    changes += version.experiments.reduce((total, experiment) => total + experiment.changes.length, 0)
    changes += (version.history ?? []).length
  }

  return {
    cameraName: backup.camera.name,
    versions: backup.versions.length,
    nodes,
    parameters,
    configurations,
    values,
    experiments,
    changes,
    hasExperiments: experiments > 0,
  }
}
