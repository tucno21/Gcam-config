import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

/**
 * Servidor MCP del catálogo GCam (Etapa 12).
 *
 * Habla **solo** con la API de la Etapa 11 (`/api`) usando el JWT del usuario.
 * No accede a Supabase directamente ni maneja claves privilegiadas.
 *
 * Variables de entorno (nunca se guardan en el repositorio):
 * - `GCAM_API_URL`: base de la API, p. ej. http://localhost:3000/api
 * - `GCAM_API_TOKEN`: access token de Supabase Auth del usuario.
 *
 * La escritura está limitada a crear experimentos, registrar su resultado,
 * guardar recomendaciones y registrar cambios; aplicar un cambio a un perfil
 * requiere `apply: true` explícito y nunca ocurre por iniciativa del servidor.
 */

const API_URL = (process.env.GCAM_API_URL ?? '').trim().replace(/\/+$/, '')
const API_TOKEN = (process.env.GCAM_API_TOKEN ?? '').trim()

if (!API_URL || !API_TOKEN) {
  console.error('[gcam-mcp] Faltan GCAM_API_URL y/o GCAM_API_TOKEN.')
  process.exit(1)
}

type Envelope<T> = { data: T; meta?: Record<string, unknown> }
type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean }

const buildQuery = (query: Record<string, string | number | undefined>): string => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

const api = async <T>(path: string, options?: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown }): Promise<Envelope<T>> => {
  const response = await fetch(`${API_URL}${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      ...(options?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const payload = (await response.json().catch(() => null)) as
    | (Envelope<T> & { error?: { message?: string } })
    | null

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${payload?.error?.message ?? 'error desconocido'}`)
  }
  return payload as Envelope<T>
}

const textResult = (value: unknown): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
})

const run = async (action: () => Promise<unknown>): Promise<ToolResult> => {
  try {
    return textResult(await action())
  } catch (error) {
    return {
      content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
      isError: true,
    }
  }
}

/* ── Tipos de las respuestas de la API (contrato: docs/API.md) ──────────── */

type Camera = { id: string; name: string; slug: string; versionCount: number; description: string | null }
type Version = { id: string; cameraId: string; version: string; nodeCount: number; configurationCount: number }
type Node = { id: string; parentId: string | null; name: string; nodeType: string; sortOrder: number }
type Parameter = {
  id: string
  nodeId: string
  key: string | null
  name: string
  dataType: string
  unit: string | null
  defaultValue: unknown
  defaultValueSource: string
  allowedValues: string[] | null
  isActive: boolean
}
type Configuration = { id: string; name: string; isDefault: boolean; isActive: boolean; valueCount: number }
type ConfigValue = {
  parameterId: string
  parameterName: string | null
  dataType: string | null
  unit: string | null
  defaultValue: unknown
  value: unknown
}
type Experiment = {
  id: string
  configurationId: string
  configurationName: string
  title: string
  status: string
  objective: string | null
  hypothesis: string | null
  observations: string | null
  conclusion: string | null
  startedAt: string | null
  completedAt: string | null
  changeCount: number
}
type Change = {
  id: string
  experimentId: string
  parameterId: string
  parameterName: string | null
  parameterKey: string | null
  previousValue: unknown
  newValue: unknown
  reason: string | null
  observation: string | null
  pathSnapshot: string[] | null
  appliedToProfile: boolean
  createdAt: string
}

const pathsByNode = (nodes: Node[]): Map<string, string[]> => {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const cache = new Map<string, string[]>()

  const pathOf = (nodeId: string): string[] => {
    const cached = cache.get(nodeId)
    if (cached) return cached
    const path: string[] = []
    let current: string | null = nodeId
    let guard = 0
    while (current && guard < 100) {
      const node = byId.get(current)
      if (!node) break
      path.unshift(node.name)
      current = node.parentId
      guard += 1
    }
    cache.set(nodeId, path)
    return path
  }

  for (const node of nodes) pathOf(node.id)
  return cache
}

const matchesType = (dataType: string, value: unknown, allowedValues: string[] | null): boolean => {
  if (value === null || value === undefined) return false
  switch (dataType) {
    case 'integer':
      return typeof value === 'number' && Number.isSafeInteger(value)
    case 'decimal':
      return typeof value === 'number' && Number.isFinite(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'string':
      return typeof value === 'string'
    case 'enum':
      return typeof value === 'string' && (allowedValues ?? []).includes(value)
    case 'json':
      return typeof value === 'object'
    default:
      return false
  }
}

const INSTRUCTIONS = `Servidor del catálogo GCam. Consulta siempre los datos reales antes de responder.

Reglas:
1. Identifica cámara y versión exactas; no mezcles versiones ni cámaras.
2. Cita la ruta jerárquica de cada parámetro recomendado (campo \`path\`).
3. Distingue valor predeterminado (documentación) de valor actual del perfil.
4. Explica por qué propones un cambio y marca la incertidumbre; no presentes hipótesis como hechos.
5. Recomienda pocos parámetros por experimento para poder atribuir resultados.
6. No inventes nombres, rutas, rangos ni valores; si falta documentación, dilo.
7. No apliques cambios: \`apply\` es false salvo que el usuario lo pida explícitamente.
8. Guarda recomendaciones solo cuando el usuario lo solicite y regístralas como propuestas.
9. No asumas que un parámetro tiene el mismo efecto en otra cámara o versión.`

const server = new McpServer(
  { name: 'gcam-catalog', version: '1.0.0' },
  { instructions: INSTRUCTIONS },
)

/* ── Lectura ────────────────────────────────────────────────────────────── */

server.registerTool(
  'list_cameras',
  {
    title: 'Listar cámaras',
    description: 'Cámaras del usuario con número de versiones. Admite búsqueda por nombre o slug.',
    inputSchema: {
      search: z.string().max(80).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
  },
  async (args) =>
    run(async () => {
      const query = buildQuery({ search: args.search, limit: args.limit })
      return api<Camera[]>(`/cameras${query}`)
    }),
)

server.registerTool(
  'list_camera_versions',
  {
    title: 'Listar versiones de una cámara',
    description: 'Versiones de una cámara, con conteo de nodos y perfiles. Incluye archivadas con active=all.',
    inputSchema: {
      cameraId: z.uuid(),
      active: z.enum(['active', 'archived', 'all']).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
  },
  async (args) =>
    run(async () => {
      const query = buildQuery({ active: args.active, limit: args.limit })
      return api<Version[]>(`/cameras/${args.cameraId}/versions${query}`)
    }),
)

server.registerTool(
  'get_parameter_tree',
  {
    title: 'Obtener árbol de parámetros',
    description: 'Nodos de una versión en orden. `parentId` reconstruye la jerarquía; no hay límite de profundidad.',
    inputSchema: { versionId: z.uuid() },
  },
  async (args) =>
    run(async () => {
      const result = await api<Node[]>(`/versions/${args.versionId}/tree`)
      return { nodes: result.data, truncated: result.meta?.truncated ?? false, total: result.data.length }
    }),
)

server.registerTool(
  'find_parameter',
  {
    title: 'Buscar parámetro por nombre, clave o ruta',
    description:
      'Busca en los parámetros de una versión por nombre, clave técnica o cualquier nombre de su ruta jerárquica. Devuelve la ruta y el valor predeterminado.',
    inputSchema: {
      versionId: z.uuid(),
      query: z.string().min(1).max(80),
      limit: z.number().int().min(1).max(50).optional(),
    },
  },
  async (args) =>
    run(async () => {
      const [tree, first] = await Promise.all([
        api<Node[]>(`/versions/${args.versionId}/tree`),
        api<Parameter[]>(`/versions/${args.versionId}/parameters?limit=100`),
      ])

      const parameters = [...first.data]
      const total = typeof first.meta?.total === 'number' ? first.meta.total : parameters.length
      const pages = Math.min(Math.ceil(total / 100), 3)
      for (let page = 1; page < pages; page += 1) {
        const next = await api<Parameter[]>(`/versions/${args.versionId}/parameters?limit=100&offset=${page * 100}`)
        parameters.push(...next.data)
      }

      const paths = pathsByNode(tree.data)
      const term = args.query.toLowerCase()
      const limit = args.limit ?? 10

      const matches = parameters
        .map((parameter) => ({ parameter, path: paths.get(parameter.nodeId) ?? [] }))
        .filter(({ parameter, path }) =>
          `${parameter.name} ${parameter.key ?? ''} ${path.join(' ')}`.toLowerCase().includes(term),
        )
        .slice(0, limit)
        .map(({ parameter, path }) => ({
          id: parameter.id,
          name: parameter.name,
          key: parameter.key,
          path,
          dataType: parameter.dataType,
          unit: parameter.unit,
          defaultValue: parameter.defaultValue,
          defaultValueSource: parameter.defaultValueSource,
          isActive: parameter.isActive,
        }))

      return { query: args.query, matches, scanned: parameters.length }
    }),
)

server.registerTool(
  'get_parameter_details',
  {
    title: 'Ficha de un parámetro',
    description: 'Definición completa, ruta calculada, nodo y versión de un parámetro.',
    inputSchema: { parameterId: z.uuid() },
  },
  async (args) =>
    run(async () => {
      const result = await api<{ parameter: Parameter; node: { id: string; name: string }; path: string[]; cameraVersionId: string }>(
        `/parameters/${args.parameterId}`,
      )
      return result.data
    }),
)

server.registerTool(
  'get_configuration',
  {
    title: 'Consultar perfil',
    description:
      'Perfil con sus valores actuales. Cada valor incluye el predeterminado documentado; un parámetro ausente está «sin valor personalizado».',
    inputSchema: { configurationId: z.uuid() },
  },
  async (args) =>
    run(async () => {
      const result = await api<{ configuration: Configuration; values: ConfigValue[] }>(
        `/configurations/${args.configurationId}`,
      )
      return result.data
    }),
)

server.registerTool(
  'get_parameter_history',
  {
    title: 'Historial de un parámetro',
    description:
      'Cambios registrados para un parámetro en todos los perfiles de una versión, con ruta histórica congelada y si se aplicaron al perfil.',
    inputSchema: { versionId: z.uuid(), parameterId: z.uuid(), limit: z.number().int().min(1).max(100).optional() },
  },
  async (args) =>
    run(async () => {
      const [configurations, experiments] = await Promise.all([
        api<Configuration[]>(`/versions/${args.versionId}/configurations?active=all&limit=100`),
        api<Experiment[]>(`/experiments?versionId=${args.versionId}&limit=100`),
      ])

      const experimentTitles = new Map(experiments.data.map((experiment) => [experiment.id, experiment.title]))
      const history: Array<Change & { experimentTitle: string | null }> = []

      for (const configuration of configurations.data) {
        const changes = await api<Change[]>(`/configurations/${configuration.id}/changes?limit=100`)
        for (const change of changes.data) {
          if (change.parameterId !== args.parameterId) continue
          history.push({ ...change, experimentTitle: experimentTitles.get(change.experimentId) ?? null })
        }
      }

      history.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return { total: history.length, changes: history.slice(0, args.limit ?? 50) }
    }),
)

server.registerTool(
  'list_experiments',
  {
    title: 'Listar experimentos',
    description: 'Experimentos de una versión o perfil, opcionalmente filtrados por estado.',
    inputSchema: {
      versionId: z.uuid().optional(),
      configurationId: z.uuid().optional(),
      status: z.enum(['planned', 'in_progress', 'completed', 'failed', 'inconclusive']).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
  },
  async (args) =>
    run(async () => {
      const query = buildQuery({
        versionId: args.versionId,
        configurationId: args.configurationId,
        status: args.status,
        limit: args.limit,
      })
      return api<Experiment[]>(`/experiments${query}`)
    }),
)

server.registerTool(
  'compare_experiments',
  {
    title: 'Comparar dos experimentos',
    description:
      'Compara estado, observaciones/conclusión y el último valor registrado por parámetro en dos experimentos.',
    inputSchema: { experimentIdA: z.uuid(), experimentIdB: z.uuid() },
  },
  async (args) =>
    run(async () => {
      const [a, b] = await Promise.all([
        api<{ experiment: Experiment; changes: Change[] }>(`/experiments/${args.experimentIdA}`),
        api<{ experiment: Experiment; changes: Change[] }>(`/experiments/${args.experimentIdB}`),
      ])

      const lastByParameter = (changes: Change[]) => {
        const map = new Map<string, Change>()
        for (const change of [...changes].sort((x, y) => x.createdAt.localeCompare(y.createdAt))) {
          map.set(change.parameterId, change)
        }
        return map
      }
      const lastA = lastByParameter(a.data.changes)
      const lastB = lastByParameter(b.data.changes)
      const parameterIds = new Set([...lastA.keys(), ...lastB.keys()])

      const rows = [...parameterIds].map((parameterId) => {
        const changeA = lastA.get(parameterId)
        const changeB = lastB.get(parameterId)
        return {
          parameterId,
          parameterName: changeA?.parameterName ?? changeB?.parameterName ?? null,
          path: changeA?.pathSnapshot ?? changeB?.pathSnapshot ?? null,
          experimentA: changeA
            ? { previousValue: changeA.previousValue, newValue: changeA.newValue, appliedToProfile: changeA.appliedToProfile }
            : null,
          experimentB: changeB
            ? { previousValue: changeB.previousValue, newValue: changeB.newValue, appliedToProfile: changeB.appliedToProfile }
            : null,
        }
      })

      return {
        experimentA: {
          title: a.data.experiment.title,
          status: a.data.experiment.status,
          observations: a.data.experiment.observations,
          conclusion: a.data.experiment.conclusion,
        },
        experimentB: {
          title: b.data.experiment.title,
          status: b.data.experiment.status,
          observations: b.data.experiment.observations,
          conclusion: b.data.experiment.conclusion,
        },
        rows,
      }
    }),
)

/* ── Escritura limitada ─────────────────────────────────────────────────── */

server.registerTool(
  'create_experiment',
  {
    title: 'Crear experimento',
    description:
      'Crea un experimento en un perfil. Escribe datos: úsalo solo cuando el usuario lo pida. El estado inicial por defecto es planificado.',
    inputSchema: {
      configurationId: z.uuid(),
      title: z.string().min(1).max(120),
      objective: z.string().max(1000).optional(),
      hypothesis: z.string().max(1000).optional(),
      status: z.enum(['planned', 'in_progress', 'completed', 'failed', 'inconclusive']).optional(),
    },
  },
  async (args) =>
    run(async () => {
      const result = await api<Experiment>('/experiments', {
        method: 'POST',
        body: {
          configurationId: args.configurationId,
          title: args.title,
          objective: args.objective,
          hypothesis: args.hypothesis,
          status: args.status,
        },
      })
      return result.data
    }),
)

server.registerTool(
  'record_experiment_result',
  {
    title: 'Registrar resultado del experimento',
    description:
      'Actualiza observaciones, conclusión y/o estado de un experimento. No toca valores del perfil ni el historial de cambios.',
    inputSchema: {
      experimentId: z.uuid(),
      observations: z.string().max(4000).optional(),
      conclusion: z.string().max(4000).optional(),
      status: z.enum(['planned', 'in_progress', 'completed', 'failed', 'inconclusive']).optional(),
    },
  },
  async (args) =>
    run(async () => {
      const result = await api<Experiment>(`/experiments/${args.experimentId}`, {
        method: 'PATCH',
        body: { observations: args.observations, conclusion: args.conclusion, status: args.status },
      })
      return result.data
    }),
)

server.registerTool(
  'propose_parameter_changes',
  {
    title: 'Proponer cambios sin aplicarlos',
    description:
      'Valida una propuesta de cambios contra los datos reales (ruta, tipo, predeterminado y valor actual) sin escribir nada. Para guardarla, usa save_recommendation.',
    inputSchema: {
      versionId: z.uuid(),
      configurationId: z.uuid().optional(),
      changes: z
        .array(
          z.object({
            parameterId: z.uuid(),
            newValue: z.unknown(),
            reason: z.string().max(300).optional(),
          }),
        )
        .min(1)
        .max(10),
    },
  },
  async (args) =>
    run(async () => {
      let currentValues = new Map<string, unknown>()
      if (args.configurationId) {
        const configuration = await api<{ values: ConfigValue[] }>(`/configurations/${args.configurationId}`)
        currentValues = new Map(configuration.data.values.map((value) => [value.parameterId, value.value]))
      }

      const proposals: Array<Record<string, unknown>> = []
      for (const change of args.changes) {
        const detail = await api<{ parameter: Parameter; path: string[] }>(`/parameters/${change.parameterId}`)
        const parameter = detail.data.parameter
        proposals.push({
          parameterId: parameter.id,
          name: parameter.name,
          key: parameter.key,
          path: detail.data.path,
          dataType: parameter.dataType,
          unit: parameter.unit,
          defaultValue: parameter.defaultValue,
          defaultValueSource: parameter.defaultValueSource,
          currentValue: currentValues.has(parameter.id) ? currentValues.get(parameter.id) : null,
          proposedValue: change.newValue,
          reason: change.reason ?? null,
          typeValid: matchesType(parameter.dataType, change.newValue, parameter.allowedValues),
        })
      }

      return {
        versionId: args.versionId,
        configurationId: args.configurationId ?? null,
        proposals,
        note: 'Propuesta sin aplicar. Nada se ha escrito. Guarda con save_recommendation y aplica solo desde la app.',
      }
    }),
)

server.registerTool(
  'save_recommendation',
  {
    title: 'Guardar recomendación',
    description:
      'Registra una recomendación como «proposed». Nunca aplica cambios por sí sola; el usuario decide en la aplicación.',
    inputSchema: {
      versionId: z.uuid(),
      title: z.string().min(1).max(160),
      reasoningSummary: z.string().max(2000).optional(),
      suggestedChanges: z.array(z.record(z.string(), z.unknown())).min(1).max(20),
      configurationId: z.uuid().optional(),
      experimentId: z.uuid().optional(),
    },
  },
  async (args) =>
    run(async () => {
      const result = await api<Record<string, unknown>>('/ai/recommendations', {
        method: 'POST',
        body: {
          versionId: args.versionId,
          title: args.title,
          reasoningSummary: args.reasoningSummary,
          suggestedChanges: args.suggestedChanges,
          configurationId: args.configurationId,
          experimentId: args.experimentId,
        },
      })
      return result.data
    }),
)

const transport = new StdioServerTransport()
await server.connect(transport)
console.error('[gcam-mcp] servidor listo (stdio)')
