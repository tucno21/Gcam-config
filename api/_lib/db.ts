import type { RequestContext } from './rest.js'
import { rest } from './rest.js'
import type { ExperimentStatusValue, Pagination } from './validation.js'
import { MAX_TREE_NODES } from './validation.js'

/**
 * Acceso a datos de la API sobre PostgREST.
 *
 * Todas las consultas llevan columnas explícitas, filtros y límite/paginación.
 * Se ejecutan con el JWT del usuario: RLS decide qué filas existen para él.
 * Los DTO devueltos son el contrato documentado en `docs/API.md`.
 */

/* ── Filas ──────────────────────────────────────────────────────────────── */

type CameraRow = {
  id: string
  name: string
  slug: string
  description: string | null
  developer: string | null
  website_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  camera_versions?: Array<{ count: number }>
}

type VersionRow = {
  id: string
  camera_id: string
  version: string
  release_label: string | null
  notes: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  parameter_nodes?: Array<{ count: number }>
  configurations?: Array<{ count: number }>
}

type NodeRow = {
  id: string
  camera_version_id: string
  parent_id: string | null
  name: string
  description: string | null
  node_type: string
  sort_order: number
  created_at: string
  updated_at: string
}

type ParameterRow = {
  id: string
  node_id: string
  key: string | null
  name: string
  description: string | null
  data_type: string
  unit: string | null
  default_value: unknown
  default_value_source: string
  default_value_confidence: string | null
  allowed_values: string[] | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

type ConfigurationRow = {
  id: string
  camera_version_id: string
  name: string
  description: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  configuration_values?: Array<{ count: number }>
}

type ParameterEmbed = {
  name: string
  key: string | null
  data_type: string
  unit: string | null
  default_value: unknown
  is_active: boolean
}

type ConfigurationValueRow = {
  id: string
  configuration_id: string
  parameter_id: string
  value: unknown
  notes: string | null
  updated_at: string
  parameters?: ParameterEmbed | ParameterEmbed[] | null
}

type ExperimentRow = {
  id: string
  configuration_id: string
  title: string
  objective: string | null
  hypothesis: string | null
  status: ExperimentStatusValue
  observations: string | null
  conclusion: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  configurations?: { name: string } | Array<{ name: string }> | null
  parameter_changes?: Array<{ count: number }>
}

type ChangeRow = {
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
  parameters?: { name: string; key: string | null } | Array<{ name: string; key: string | null }> | null
}

/** PostgREST tipa los embeds de FK como array; normaliza a un solo objeto. */
const singleEmbed = <T>(embed: T | T[] | null | undefined): T | null =>
  Array.isArray(embed) ? (embed[0] ?? null) : (embed ?? null)

/* ── Mapeadores ─────────────────────────────────────────────────────────── */

export const toCamera = (row: CameraRow) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  developer: row.developer,
  websiteUrl: row.website_url,
  isActive: row.is_active,
  versionCount: row.camera_versions?.[0]?.count ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const toVersion = (row: VersionRow) => ({
  id: row.id,
  cameraId: row.camera_id,
  version: row.version,
  releaseLabel: row.release_label,
  notes: row.notes,
  isDefault: row.is_default,
  isActive: row.is_active,
  nodeCount: row.parameter_nodes?.[0]?.count ?? 0,
  configurationCount: row.configurations?.[0]?.count ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const toNode = (row: NodeRow) => ({
  id: row.id,
  cameraVersionId: row.camera_version_id,
  parentId: row.parent_id,
  name: row.name,
  description: row.description,
  nodeType: row.node_type,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const toParameter = (row: ParameterRow) => ({
  id: row.id,
  nodeId: row.node_id,
  key: row.key,
  name: row.name,
  description: row.description,
  dataType: row.data_type,
  unit: row.unit,
  defaultValue: row.default_value,
  defaultValueSource: row.default_value_source,
  defaultValueConfidence: row.default_value_confidence,
  allowedValues: row.allowed_values,
  sortOrder: row.sort_order,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const toConfiguration = (row: ConfigurationRow) => ({
  id: row.id,
  cameraVersionId: row.camera_version_id,
  name: row.name,
  description: row.description,
  isDefault: row.is_default,
  isActive: row.is_active,
  valueCount: row.configuration_values?.[0]?.count ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const toChange = (row: ChangeRow) => {
  const parameter = singleEmbed(row.parameters)
  return {
    id: row.id,
    experimentId: row.experiment_id,
    parameterId: row.parameter_id,
    parameterName: parameter?.name ?? null,
    parameterKey: parameter?.key ?? null,
    previousValue: row.previous_value,
    newValue: row.new_value,
    reason: row.reason,
    observation: row.observation,
    pathSnapshot: row.path_snapshot,
    appliedToProfile: row.applied_to_profile,
    createdAt: row.created_at,
  }
}

const configurationNameOf = (row: ExperimentRow): string => singleEmbed(row.configurations)?.name ?? 'Perfil'

export const toExperiment = (row: ExperimentRow) => ({
  id: row.id,
  configurationId: row.configuration_id,
  configurationName: configurationNameOf(row),
  title: row.title,
  objective: row.objective,
  hypothesis: row.hypothesis,
  status: row.status,
  observations: row.observations,
  conclusion: row.conclusion,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  changeCount: row.parameter_changes?.[0]?.count ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

/* ── Columnas ───────────────────────────────────────────────────────────── */

const CAMERA_COLUMNS =
  'id, name, slug, description, developer, website_url, is_active, created_at, updated_at, camera_versions(count)'
const VERSION_COLUMNS =
  'id, camera_id, version, release_label, notes, is_default, is_active, created_at, updated_at, parameter_nodes(count), configurations(count)'
const NODE_COLUMNS =
  'id, camera_version_id, parent_id, name, description, node_type, sort_order, created_at, updated_at'
const PARAMETER_COLUMNS =
  'id, node_id, key, name, description, data_type, unit, default_value, default_value_source, default_value_confidence, allowed_values, sort_order, is_active, created_at, updated_at'
const CONFIGURATION_COLUMNS =
  'id, camera_version_id, name, description, is_default, is_active, created_at, updated_at, configuration_values(count)'
const EXPERIMENT_COLUMNS =
  'id, configuration_id, title, objective, hypothesis, status, observations, conclusion, started_at, completed_at, created_at, updated_at, configurations(name), parameter_changes(count)'
const CHANGE_COLUMNS =
  'id, experiment_id, parameter_id, previous_value, new_value, reason, observation, path_snapshot, applied_to_profile, created_at, parameters(name, key)'

const listFilter = (ids: string[]): string => `in.(${ids.join(',')})`

/* ── Consultas ──────────────────────────────────────────────────────────── */

export const listCameras = async (
  context: RequestContext,
  options: { search?: string; active: 'active' | 'archived' | 'all'; pagination: Pagination },
) => {
  const { limit, offset } = options.pagination
  const query: Record<string, string | number | undefined> = {
    select: CAMERA_COLUMNS,
    order: 'name.asc',
    limit,
    offset,
  }
  if (options.active === 'active') query.is_active = 'eq.true'
  if (options.active === 'archived') query.is_active = 'eq.false'
  if (options.search) query.or = `(name.ilike.*${options.search}*,slug.ilike.*${options.search}*)`

  const { data, total } = await rest<CameraRow[]>(context, { path: 'cameras', query, prefer: 'count=exact' })
  return { items: (data ?? []).map(toCamera), total: total ?? 0 }
}

export const getCamera = async (context: RequestContext, cameraId: string) => {
  const { data } = await rest<CameraRow>(context, {
    path: 'cameras',
    single: true,
    query: { select: CAMERA_COLUMNS, id: `eq.${cameraId}` },
  })
  return toCamera(data)
}

export const listVersions = async (
  context: RequestContext,
  cameraId: string,
  options: { active: 'active' | 'archived' | 'all'; pagination: Pagination },
) => {
  const { limit, offset } = options.pagination
  const query: Record<string, string | number | undefined> = {
    select: VERSION_COLUMNS,
    camera_id: `eq.${cameraId}`,
    order: 'is_default.desc,version.desc',
    limit,
    offset,
  }
  if (options.active === 'active') query.is_active = 'eq.true'
  if (options.active === 'archived') query.is_active = 'eq.false'

  const { data, total } = await rest<VersionRow[]>(context, { path: 'camera_versions', query, prefer: 'count=exact' })
  return { items: (data ?? []).map(toVersion), total: total ?? 0 }
}

export const getVersion = async (context: RequestContext, versionId: string) => {
  const { data } = await rest<VersionRow>(context, {
    path: 'camera_versions',
    single: true,
    query: { select: VERSION_COLUMNS, id: `eq.${versionId}` },
  })
  return toVersion(data)
}

export const listConfigurationsByVersion = async (
  context: RequestContext,
  versionId: string,
  options: { active: 'active' | 'archived' | 'all'; pagination: Pagination },
) => {
  const query: Record<string, string | number | undefined> = {
    select: CONFIGURATION_COLUMNS,
    camera_version_id: `eq.${versionId}`,
    order: 'is_default.desc,name.asc',
    limit: options.pagination.limit,
    offset: options.pagination.offset,
  }
  if (options.active === 'active') query.is_active = 'eq.true'
  if (options.active === 'archived') query.is_active = 'eq.false'

  const { data, total } = await rest<ConfigurationRow[]>(context, {
    path: 'configurations',
    query,
    prefer: 'count=exact',
  })
  return { items: (data ?? []).map(toConfiguration), total: total ?? 0 }
}

export const listVersionNodes = async (context: RequestContext, versionId: string) => {  const { data } = await rest<NodeRow[]>(context, {
    path: 'parameter_nodes',
    query: {
      select: NODE_COLUMNS,
      camera_version_id: `eq.${versionId}`,
      order: 'sort_order.asc,created_at.asc',
      limit: MAX_TREE_NODES + 1,
    },
  })
  const rows = data ?? []
  return { nodes: rows.slice(0, MAX_TREE_NODES).map(toNode), truncated: rows.length > MAX_TREE_NODES }
}

export const listParameters = async (
  context: RequestContext,
  versionId: string,
  options: { nodeId?: string; search?: string; pagination: Pagination },
) => {
  const { nodes } = await listVersionNodes(context, versionId)
  const nodeIds = nodes.filter((node) => (options.nodeId ? node.id === options.nodeId : true)).map((node) => node.id)
  if (nodeIds.length === 0) return { items: [], total: 0 }

  const { limit, offset } = options.pagination
  const query: Record<string, string | number | undefined> = {
    select: PARAMETER_COLUMNS,
    node_id: listFilter(nodeIds),
    order: 'sort_order.asc,name.asc',
    limit,
    offset,
  }
  if (options.search) query.or = `(name.ilike.*${options.search}*,key.ilike.*${options.search}*)`

  const { data, total } = await rest<ParameterRow[]>(context, { path: 'parameters', query, prefer: 'count=exact' })
  return { items: (data ?? []).map(toParameter), total: total ?? 0 }
}

export const getParameterDetail = async (context: RequestContext, parameterId: string) => {
  const { data } = await rest<ParameterRow>(context, {
    path: 'parameters',
    single: true,
    query: { select: PARAMETER_COLUMNS, id: `eq.${parameterId}` },
  })
  const parameter = toParameter(data)

  const { data: nodeData } = await rest<Pick<NodeRow, 'id' | 'camera_version_id' | 'parent_id' | 'name'>>(context, {
    path: 'parameter_nodes',
    single: true,
    query: { select: 'id, camera_version_id, parent_id, name', id: `eq.${parameter.nodeId}` },
  })

  const { nodes } = await listVersionNodes(context, nodeData.camera_version_id)
  const byId = new Map(nodes.map((candidate) => [candidate.id, candidate]))

  const path: string[] = []
  let current: string | null = nodeData.id
  let guard = 0
  while (current && guard < 100) {
    const found = byId.get(current)
    if (!found) break
    path.unshift(found.name)
    current = found.parentId
    guard += 1
  }

  return {
    parameter,
    node: { id: nodeData.id, name: nodeData.name },
    cameraVersionId: nodeData.camera_version_id,
    path,
  }
}

export const getConfiguration = async (context: RequestContext, configurationId: string) => {
  const { data } = await rest<ConfigurationRow>(context, {
    path: 'configurations',
    single: true,
    query: { select: CONFIGURATION_COLUMNS, id: `eq.${configurationId}` },
  })
  const configuration = toConfiguration(data)

  const { data: valueData } = await rest<ConfigurationValueRow[]>(context, {
    path: 'configuration_values',
    query: {
      select:
        'id, configuration_id, parameter_id, value, notes, updated_at, parameters(name, key, data_type, unit, default_value, is_active)',
      configuration_id: `eq.${configurationId}`,
      order: 'updated_at.desc',
      limit: 2_000,
    },
  })

  const values = (valueData ?? []).map((row) => {
    const parameter = singleEmbed(row.parameters)
    return {
      id: row.id,
      parameterId: row.parameter_id,
      parameterName: parameter?.name ?? null,
      parameterKey: parameter?.key ?? null,
      dataType: parameter?.data_type ?? null,
      unit: parameter?.unit ?? null,
      defaultValue: parameter?.default_value ?? null,
      parameterActive: parameter?.is_active ?? null,
      value: row.value,
      notes: row.notes,
      updatedAt: row.updated_at,
    }
  })

  return { configuration, values }
}

const experimentIdsOfConfiguration = async (context: RequestContext, configurationId: string): Promise<string[]> => {
  const { data } = await rest<Array<{ id: string }>>(context, {
    path: 'experiments',
    query: { select: 'id', configuration_id: `eq.${configurationId}`, limit: 1_000 },
  })
  return (data ?? []).map((row) => row.id)
}

export const listConfigurationChanges = async (
  context: RequestContext,
  configurationId: string,
  pagination: Pagination,
) => {
  const experimentIds = await experimentIdsOfConfiguration(context, configurationId)
  if (experimentIds.length === 0) return { items: [], total: 0 }

  const { data, total } = await rest<ChangeRow[]>(context, {
    path: 'parameter_changes',
    query: {
      select: CHANGE_COLUMNS,
      experiment_id: listFilter(experimentIds),
      order: 'created_at.desc',
      limit: pagination.limit,
      offset: pagination.offset,
    },
    prefer: 'count=exact',
  })

  return { items: (data ?? []).map(toChange), total: total ?? 0 }
}

export const listExperiments = async (
  context: RequestContext,
  options: { versionId?: string; configurationId?: string; status?: ExperimentStatusValue; pagination: Pagination },
) => {
  let configurationIds: string[] | undefined

  if (options.versionId) {
    const { data } = await rest<Array<{ id: string }>>(context, {
      path: 'configurations',
      query: { select: 'id', camera_version_id: `eq.${options.versionId}`, limit: 100 },
    })
    configurationIds = (data ?? []).map((row) => row.id)
    if (configurationIds.length === 0) return { items: [], total: 0 }
  }
  if (options.configurationId) configurationIds = [options.configurationId]

  const query: Record<string, string | number | undefined> = {
    select: EXPERIMENT_COLUMNS,
    order: 'created_at.desc',
    limit: options.pagination.limit,
    offset: options.pagination.offset,
  }
  if (configurationIds) query.configuration_id = listFilter(configurationIds)
  if (options.status) query.status = `eq.${options.status}`

  const { data, total } = await rest<ExperimentRow[]>(context, { path: 'experiments', query, prefer: 'count=exact' })
  return { items: (data ?? []).map(toExperiment), total: total ?? 0 }
}

export const getExperiment = async (context: RequestContext, experimentId: string) => {
  const { data } = await rest<ExperimentRow>(context, {
    path: 'experiments',
    single: true,
    query: { select: EXPERIMENT_COLUMNS, id: `eq.${experimentId}` },
  })

  const { data: changeData } = await rest<ChangeRow[]>(context, {
    path: 'parameter_changes',
    query: { select: CHANGE_COLUMNS, experiment_id: `eq.${experimentId}`, order: 'created_at.asc', limit: 1_000 },
  })

  return { experiment: toExperiment(data), changes: (changeData ?? []).map(toChange) }
}

export const createExperiment = async (
  context: RequestContext,
  input: {
    configurationId: string
    title: string
    objective: string | null
    hypothesis: string | null
    status: ExperimentStatusValue
  },
) => {
  const now = new Date().toISOString()
  const closing = input.status === 'completed' || input.status === 'failed' || input.status === 'inconclusive'

  const { data } = await rest<ExperimentRow>(context, {
    method: 'POST',
    path: 'experiments',
    query: { select: EXPERIMENT_COLUMNS },
    prefer: 'return=representation',
    single: true,
    body: {
      configuration_id: input.configurationId,
      title: input.title,
      objective: input.objective,
      hypothesis: input.hypothesis,
      status: input.status,
      started_at: input.status === 'planned' ? null : now,
      completed_at: closing ? now : null,
    },
  })

  return toExperiment(data)
}

/**
 * Actualiza solo el resultado del experimento (observaciones, conclusión y/o
 * estado). Nunca toca el perfil ni el historial de cambios.
 */
export const updateExperimentResult = async (
  context: RequestContext,
  experimentId: string,
  input: { observations?: string | null; conclusion?: string | null; status?: ExperimentStatusValue },
) => {
  const { data: current } = await rest<{ started_at: string | null; completed_at: string | null; status: ExperimentStatusValue }>(
    context,
    {
      path: 'experiments',
      single: true,
      query: { select: 'started_at, completed_at, status', id: `eq.${experimentId}` },
    },
  )

  const body: Record<string, unknown> = {}
  if (input.observations !== undefined) body.observations = input.observations
  if (input.conclusion !== undefined) body.conclusion = input.conclusion

  if (input.status !== undefined) {
    const now = new Date().toISOString()
    const closing = input.status === 'completed' || input.status === 'failed' || input.status === 'inconclusive'
    body.status = input.status
    body.started_at = input.status === 'planned' ? null : (current.started_at ?? now)
    body.completed_at = closing ? now : null
  }

  const { data } = await rest<ExperimentRow>(context, {
    method: 'PATCH',
    path: 'experiments',
    query: { select: EXPERIMENT_COLUMNS, id: `eq.${experimentId}` },
    prefer: 'return=representation',
    single: true,
    body,
  })

  return toExperiment(data)
}

export const getExperimentConfigurationId = async (context: RequestContext, experimentId: string): Promise<string> => {  const { data } = await rest<{ configuration_id: string }>(context, {
    path: 'experiments',
    single: true,
    query: { select: 'configuration_id', id: `eq.${experimentId}` },
  })
  return data.configuration_id
}

export const getConfigurationVersionId = async (context: RequestContext, configurationId: string): Promise<string> => {
  const { data } = await rest<{ camera_version_id: string }>(context, {
    path: 'configurations',
    single: true,
    query: { select: 'camera_version_id', id: `eq.${configurationId}` },
  })
  return data.camera_version_id
}

export const getParameterWithNode = async (
  context: RequestContext,
  parameterId: string,
): Promise<{ parameter: ReturnType<typeof toParameter>; versionId: string }> => {
  const { data } = await rest<ParameterRow>(context, {
    path: 'parameters',
    single: true,
    query: { select: PARAMETER_COLUMNS, id: `eq.${parameterId}` },
  })
  const parameter = toParameter(data)

  const { data: nodeData } = await rest<{ camera_version_id: string }>(context, {
    path: 'parameter_nodes',
    single: true,
    query: { select: 'camera_version_id', id: `eq.${parameter.nodeId}` },
  })

  return { parameter, versionId: nodeData.camera_version_id }
}

export const getCurrentConfigurationValue = async (
  context: RequestContext,
  configurationId: string,
  parameterId: string,
): Promise<unknown> => {
  const { data } = await rest<Array<{ value: unknown }>>(context, {
    path: 'configuration_values',
    query: {
      select: 'value',
      configuration_id: `eq.${configurationId}`,
      parameter_id: `eq.${parameterId}`,
      limit: 1,
    },
  })
  return data?.[0]?.value ?? null
}

export const applyConfigurationValue = async (
  context: RequestContext,
  configurationId: string,
  parameterId: string,
  value: unknown,
): Promise<void> => {
  await rest<null>(context, {
    method: 'POST',
    path: 'configuration_values',
    query: { on_conflict: 'configuration_id,parameter_id' },
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: { configuration_id: configurationId, parameter_id: parameterId, value },
  })
}

export const insertParameterChange = async (
  context: RequestContext,
  input: {
    experimentId: string
    parameterId: string
    previousValue: unknown
    newValue: unknown
    reason: string | null
    observation: string | null
    pathSnapshot: string[] | null
    appliedToProfile: boolean
  },
) => {
  const { data } = await rest<ChangeRow>(context, {
    method: 'POST',
    path: 'parameter_changes',
    query: { select: CHANGE_COLUMNS },
    prefer: 'return=representation',
    single: true,
    body: {
      experiment_id: input.experimentId,
      parameter_id: input.parameterId,
      previous_value: input.previousValue ?? null,
      new_value: input.newValue,
      reason: input.reason,
      observation: input.observation,
      path_snapshot: input.pathSnapshot,
      applied_to_profile: input.appliedToProfile,
    },
  })

  return toChange(data)
}

export const createRecommendation = async (
  context: RequestContext,
  input: {
    versionId: string
    configurationId: string | null
    experimentId: string | null
    title: string
    reasoningSummary: string | null
    suggestedChanges: unknown[]
  },
) => {
  type RecommendationRow = {
    id: string
    camera_version_id: string
    configuration_id: string | null
    experiment_id: string | null
    title: string
    reasoning_summary: string | null
    suggested_changes: unknown
    status: string
    created_at: string
    updated_at: string
  }

  const { data } = await rest<RecommendationRow>(context, {
    method: 'POST',
    path: 'ai_recommendations',
    query: {
      select:
        'id, camera_version_id, configuration_id, experiment_id, title, reasoning_summary, suggested_changes, status, created_at, updated_at',
    },
    prefer: 'return=representation',
    single: true,
    body: {
      camera_version_id: input.versionId,
      configuration_id: input.configurationId,
      experiment_id: input.experimentId,
      title: input.title,
      reasoning_summary: input.reasoningSummary,
      suggested_changes: input.suggestedChanges,
      status: 'proposed',
    },
  })

  return {
    id: data.id,
    cameraVersionId: data.camera_version_id,
    configurationId: data.configuration_id,
    experimentId: data.experiment_id,
    title: data.title,
    reasoningSummary: data.reasoning_summary,
    suggestedChanges: data.suggested_changes,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}
