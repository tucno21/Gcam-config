/**
 * Contrato de datos de la capa de servicios.
 *
 * Las filas (`*Row`) reflejan exactamente las columnas de PostgreSQL y solo se usan
 * dentro de `services/`. El dominio (`Camera`, `CameraVersion`, …) usa camelCase y
 * omite `owner_id`: el propietario lo resuelve RLS, no la interfaz.
 *
 * Ver `docs/DATABASE.md` para columnas, restricciones y reglas de borrado.
 */

/* ── Comunes ─────────────────────────────────────────────────────────────── */

/** Página de resultados. `total` es el conteo exacto del filtro, no el tamaño de `items`. */
export type Page<T> = {
  items: T[]
  total: number
  limit: number
  offset: number
}

export type ListParams = {
  /** Búsqueda por texto; el servicio la sanea antes de enviarla. */
  search?: string
  limit?: number
  offset?: number
}

/** Registro archivado en lugar de borrado (`is_active = false`). */
export type ActiveFilter = 'active' | 'archived' | 'all'

/* ── Cámaras ─────────────────────────────────────────────────────────────── */

export type CameraRow = {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  developer: string | null
  website_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Camera = {
  id: string
  name: string
  slug: string
  description: string | null
  developer: string | null
  websiteUrl: string | null
  isActive: boolean
  /** Versiones registradas, activas y archivadas (0 si no se consultaron). */
  versionCount: number
  createdAt: string
  updatedAt: string
}

export type CameraInput = {
  name: string
  slug: string
  description?: string | null
  developer?: string | null
  websiteUrl?: string | null
  isActive?: boolean
}

export type CameraListParams = ListParams & { active?: ActiveFilter }

/* ── Versiones ───────────────────────────────────────────────────────────── */

export type CameraVersionRow = {
  id: string
  camera_id: string
  version: string
  release_label: string | null
  notes: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CameraVersion = {
  id: string
  cameraId: string
  version: string
  releaseLabel: string | null
  notes: string | null
  isDefault: boolean
  isActive: boolean
  /** Nodos del árbol (estructura de parámetros) de esta versión. */
  nodeCount: number
  /** Perfiles de configuración de esta versión. */
  configurationCount: number
  createdAt: string
  updatedAt: string
}

export type VersionInput = {
  version: string
  releaseLabel?: string | null
  notes?: string | null
  isDefault?: boolean
  isActive?: boolean
}

/* ── Nodos del árbol ─────────────────────────────────────────────────────── */

export const NODE_TYPES = ['category', 'group', 'subgroup'] as const
export type NodeType = (typeof NODE_TYPES)[number]

export type ParameterNodeRow = {
  id: string
  camera_version_id: string
  parent_id: string | null
  name: string
  description: string | null
  node_type: NodeType
  sort_order: number
  created_at: string
  updated_at: string
}

export type ParameterNode = {
  id: string
  cameraVersionId: string
  parentId: string | null
  name: string
  description: string | null
  nodeType: NodeType
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type NodeInput = {
  cameraVersionId: string
  parentId?: string | null
  name: string
  description?: string | null
  nodeType?: NodeType
  sortOrder?: number
}

export type NodePatch = {
  parentId?: string | null
  name?: string
  description?: string | null
  nodeType?: NodeType
  sortOrder?: number
}

/* ── Parámetros ──────────────────────────────────────────────────────────── */

export const DATA_TYPES = ['integer', 'decimal', 'boolean', 'string', 'enum', 'json'] as const
export type DataType = (typeof DATA_TYPES)[number]

export const DEFAULT_VALUE_SOURCES = ['documentation', 'original_file', 'observation', 'unknown'] as const
export type DefaultValueSource = (typeof DEFAULT_VALUE_SOURCES)[number]

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number]

export type ParameterRow = {
  id: string
  node_id: string
  key: string | null
  name: string
  description: string | null
  data_type: DataType
  unit: string | null
  default_value: unknown
  default_value_source: DefaultValueSource
  default_value_confidence: ConfidenceLevel | null
  allowed_values: string[] | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Parameter = {
  id: string
  nodeId: string
  key: string | null
  name: string
  description: string | null
  dataType: DataType
  unit: string | null
  /** Valor de referencia documentado. `null` significa **desconocido**, no vacío. */
  defaultValue: unknown
  defaultValueSource: DefaultValueSource
  defaultValueConfidence: ConfidenceLevel | null
  allowedValues: string[] | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ParameterInput = {
  nodeId: string
  name: string
  key?: string | null
  description?: string | null
  dataType: DataType
  unit?: string | null
  defaultValue?: unknown
  defaultValueSource?: DefaultValueSource
  defaultValueConfidence?: ConfidenceLevel | null
  allowedValues?: string[] | null
  sortOrder?: number
  isActive?: boolean
}

/* ── Configuraciones ─────────────────────────────────────────────────────── */

export type ConfigurationRow = {
  id: string
  camera_version_id: string
  name: string
  description: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Configuration = {
  id: string
  cameraVersionId: string
  name: string
  description: string | null
  isDefault: boolean
  isActive: boolean
  /** Valores personalizados definidos en el perfil. */
  valueCount: number
  createdAt: string
  updatedAt: string
}

export type ConfigurationInput = {
  cameraVersionId: string
  name: string
  description?: string | null
  isDefault?: boolean
  isActive?: boolean
}

export type ConfigurationValueRow = {
  id: string
  configuration_id: string
  parameter_id: string
  value: unknown
  notes: string | null
  updated_at: string
}

export type ConfigurationValue = {
  id: string
  configurationId: string
  parameterId: string
  value: unknown
  notes: string | null
  updatedAt: string
}

export type ConfigurationValueInput = {
  configurationId: string
  parameterId: string
  value: unknown
  notes?: string | null
}

/* ── Experimentos e historial ────────────────────────────────────────────── */

export const EXPERIMENT_STATUSES = ['planned', 'in_progress', 'completed', 'failed', 'inconclusive'] as const
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number]

export type ExperimentRow = {
  id: string
  configuration_id: string
  title: string
  objective: string | null
  hypothesis: string | null
  status: ExperimentStatus
  observations: string | null
  conclusion: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type Experiment = {
  id: string
  configurationId: string
  /** Nombre del perfil usado, para mostrar el contexto sin consultas extra. */
  configurationName: string
  title: string
  objective: string | null
  hypothesis: string | null
  status: ExperimentStatus
  observations: string | null
  conclusion: string | null
  startedAt: string | null
  completedAt: string | null
  /** Cambios registrados en el historial. */
  changeCount: number
  createdAt: string
  updatedAt: string
}

export type ExperimentInput = {
  configurationId: string
  title: string
  objective?: string | null
  hypothesis?: string | null
  status?: ExperimentStatus
  observations?: string | null
  conclusion?: string | null
  startedAt?: string | null
  completedAt?: string | null
}

export type ExperimentPatch = Partial<Omit<ExperimentInput, 'configurationId'>>

export type ParameterChangeRow = {
  id: string
  experiment_id: string
  parameter_id: string
  previous_value: unknown
  new_value: unknown
  reason: string | null
  observation: string | null
  path_snapshot: string[] | null
  applied_to_profile: boolean
  created_at: string
}

export type ParameterChange = {
  id: string
  experimentId: string
  parameterId: string
  previousValue: unknown
  newValue: unknown
  reason: string | null
  observation: string | null
  /** Ruta jerárquica congelada en el momento del cambio. */
  pathSnapshot: string[] | null
  /** `true` si al registrarlo también se actualizó el valor del perfil. */
  appliedToProfile: boolean
  createdAt: string
}

export type ParameterChangeInput = {
  experimentId: string
  parameterId: string
  previousValue: unknown
  newValue: unknown
  reason?: string | null
  observation?: string | null
  pathSnapshot?: string[] | null
  appliedToProfile: boolean
}
