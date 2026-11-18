import type { ApiRequest, ApiResponse } from './_lib/http'
import { ApiError, sendError, sendJson, toApiError } from './_lib/http'
import { authenticate } from './_lib/rest'
import type { RequestContext } from './_lib/rest'
import {
  applyConfigurationValue,
  createExperiment,
  createRecommendation,
  getCamera,
  getConfiguration,
  getConfigurationVersionId,
  getCurrentConfigurationValue,
  getExperiment,
  getExperimentConfigurationId,
  getParameterDetail,
  getParameterWithNode,
  getVersion,
  insertParameterChange,
  listCameras,
  listConfigurationChanges,
  listConfigurationsByVersion,
  listExperiments,
  listParameters,
  listVersionNodes,
  listVersions,
  updateExperimentResult,
} from './_lib/db'
import {
  EXPERIMENT_STATUSES,
  parseActiveFilter,
  parseExperimentStatus,
  parsePagination,
  parseSearch,
  parseUuid,
  queryString,
  requireBody,
  optionalText,
  requiredText,
  valueMatchesType,
} from './_lib/validation'
import type { DataTypeValue } from './_lib/validation'

/**
 * API segura para herramientas externas (OpenCode/MCP).
 *
 * - Autenticación: `Authorization: Bearer <access_token>` de Supabase Auth.
 * - Autorización: el JWT + RLS limitan cada consulta a las filas del usuario.
 * - Sin `service_role`: la API no puede superar RLS aunque quiera.
 * - Sin endpoints destructivos: solo lecturas y tres altas controladas.
 *
 * Contrato completo en `docs/API.md`.
 */

const segmentsOf = (req: ApiRequest): string[] => {
  const raw = req.query.path
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string') return raw.split('/').filter(Boolean)

  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    return url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  } catch {
    return []
  }
}

const methodNotAllowed = (allowed: string[]): never => {
  throw new ApiError('method_not_allowed', `Método no permitido. Usa ${allowed.join(' o ')}.`)
}

const paginationMeta = (pagination: { limit: number; offset: number }, total: number) => ({
  limit: pagination.limit,
  offset: pagination.offset,
  total,
})

/** Ruta del nodo (nombres) calculada desde las relaciones de la versión. */
const nodePath = async (context: RequestContext, versionId: string, nodeId: string): Promise<string[]> => {
  const { nodes } = await listVersionNodes(context, versionId)
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const path: string[] = []
  let current: string | null = nodeId
  let guard = 0
  while (current && guard < 100) {
    const found = byId.get(current)
    if (!found) break
    path.unshift(found.name)
    current = found.parentId
    guard += 1
  }
  return path
}

const parseSuggestedChanges = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) throw new ApiError('bad_request', '«suggestedChanges» debe ser un array de objetos.')
  if (value.length === 0) throw new ApiError('bad_request', '«suggestedChanges» no puede estar vacío.')
  if (value.length > 20) throw new ApiError('bad_request', '«suggestedChanges» admite como máximo 20 elementos.')
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new ApiError('bad_request', 'Cada elemento de «suggestedChanges» debe ser un objeto JSON.')
    }
  }
  return value
}

const parseStepPosition = (value: unknown): 'planned' | 'in_progress' | 'completed' | 'failed' | 'inconclusive' => {
  const status = parseExperimentStatus(value) ?? 'planned'
  if (!(EXPERIMENT_STATUSES as readonly string[]).includes(status)) {
    throw new ApiError('bad_request', 'Estado de experimento no válido.')
  }
  return status
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  try {
    const method = (req.method ?? 'GET').toUpperCase()
    const segments = segmentsOf(req)

    // Salud pública (sin datos del usuario).
    if (segments.length === 1 && segments[0] === 'health') {
      if (method !== 'GET') methodNotAllowed(['GET'])
      sendJson(res, 200, { status: 'ok', time: new Date().toISOString() })
      return
    }

    const context = await authenticate(req)
    const [resource, second, third] = segments

    switch (resource) {
      /* ── Cámaras ─────────────────────────────────────────────────────── */
      case 'cameras': {
        if (segments.length === 1) {
          if (method !== 'GET') methodNotAllowed(['GET'])
          const pagination = parsePagination(req.query)
          const { items, total } = await listCameras(context, {
            search: parseSearch(req.query.search),
            active: parseActiveFilter(req.query.active),
            pagination,
          })
          sendJson(res, 200, items, paginationMeta(pagination, total))
          return
        }
        if (segments.length === 2) {
          if (method !== 'GET') methodNotAllowed(['GET'])
          sendJson(res, 200, await getCamera(context, parseUuid(second, 'cameraId')))
          return
        }
        if (segments.length === 3 && third === 'versions') {
          if (method !== 'GET') methodNotAllowed(['GET'])
          const pagination = parsePagination(req.query)
          const { items, total } = await listVersions(context, parseUuid(second, 'cameraId'), {
            active: parseActiveFilter(req.query.active),
            pagination,
          })
          sendJson(res, 200, items, paginationMeta(pagination, total))
          return
        }
        throw new ApiError('not_found', 'Ruta de cámaras no encontrada.')
      }

      /* ── Versiones ───────────────────────────────────────────────────── */
      case 'versions': {
        if (segments.length === 2) {
          if (method !== 'GET') methodNotAllowed(['GET'])
          sendJson(res, 200, await getVersion(context, parseUuid(second, 'versionId')))
          return
        }
        if (segments.length === 3 && third === 'tree') {
          if (method !== 'GET') methodNotAllowed(['GET'])
          const { nodes, truncated } = await listVersionNodes(context, parseUuid(second, 'versionId'))
          sendJson(res, 200, nodes, { total: nodes.length, truncated })
          return
        }
        if (segments.length === 3 && third === 'parameters') {
          if (method !== 'GET') methodNotAllowed(['GET'])
          const pagination = parsePagination(req.query)
          const nodeId = queryString(req.query.nodeId)
          const { items, total } = await listParameters(context, parseUuid(second, 'versionId'), {
            nodeId: nodeId ? parseUuid(nodeId, 'nodeId') : undefined,
            search: parseSearch(req.query.search),
            pagination,
          })
          sendJson(res, 200, items, paginationMeta(pagination, total))
          return
        }
        if (segments.length === 3 && third === 'configurations') {
          if (method !== 'GET') methodNotAllowed(['GET'])
          const pagination = parsePagination(req.query)
          const { items, total } = await listConfigurationsByVersion(context, parseUuid(second, 'versionId'), {
            active: parseActiveFilter(req.query.active),
            pagination,
          })
          sendJson(res, 200, items, paginationMeta(pagination, total))
          return
        }
        throw new ApiError('not_found', 'Ruta de versiones no encontrada.')
      }

      /* ── Parámetros ──────────────────────────────────────────────────── */
      case 'parameters': {
        if (segments.length !== 2) throw new ApiError('not_found', 'Ruta de parámetros no encontrada.')
        if (method !== 'GET') methodNotAllowed(['GET'])
        sendJson(res, 200, await getParameterDetail(context, parseUuid(second, 'parameterId')))
        return
      }

      /* ── Perfiles ────────────────────────────────────────────────────── */
      case 'configurations': {
        if (segments.length === 2) {
          if (method !== 'GET') methodNotAllowed(['GET'])
          sendJson(res, 200, await getConfiguration(context, parseUuid(second, 'configurationId')))
          return
        }
        if (segments.length === 3 && third === 'changes') {
          if (method !== 'GET') methodNotAllowed(['GET'])
          const pagination = parsePagination(req.query)
          const { items, total } = await listConfigurationChanges(context, parseUuid(second, 'configurationId'), pagination)
          sendJson(res, 200, items, paginationMeta(pagination, total))
          return
        }
        throw new ApiError('not_found', 'Ruta de perfiles no encontrada.')
      }

      /* ── Experimentos y cambios ──────────────────────────────────────── */
      case 'experiments': {
        if (segments.length === 1) {
          if (method === 'GET') {
            const pagination = parsePagination(req.query)
            const versionId = queryString(req.query.versionId)
            const configurationId = queryString(req.query.configurationId)
            const { items, total } = await listExperiments(context, {
              versionId: versionId ? parseUuid(versionId, 'versionId') : undefined,
              configurationId: configurationId ? parseUuid(configurationId, 'configurationId') : undefined,
              status: parseExperimentStatus(req.query.status),
              pagination,
            })
            sendJson(res, 200, items, paginationMeta(pagination, total))
            return
          }
          if (method === 'POST') {
            const body = requireBody(req.body)
            const configurationId = parseUuid(body.configurationId, 'configurationId')
            const title = requiredText(body.title, 'title', 120)
            const objective = optionalText(body.objective, 'objective', 1_000) ?? null
            const hypothesis = optionalText(body.hypothesis, 'hypothesis', 1_000) ?? null
            const status = parseStepPosition(body.status)

            // Verifica acceso al perfil antes de crear (404 si RLS lo oculta).
            await getConfigurationVersionId(context, configurationId)
            const experiment = await createExperiment(context, { configurationId, title, objective, hypothesis, status })
            sendJson(res, 201, experiment)
            return
          }
          methodNotAllowed(['GET', 'POST'])
        }

        if (segments.length === 2) {
          const experimentId = parseUuid(second, 'experimentId')
          if (method === 'GET') {
            sendJson(res, 200, await getExperiment(context, experimentId))
            return
          }
          if (method === 'PATCH') {
            const body = requireBody(req.body)
            const observations = optionalText(body.observations, 'observations', 4_000)
            const conclusion = optionalText(body.conclusion, 'conclusion', 4_000)
            const status = parseExperimentStatus(body.status)
            if (observations === undefined && conclusion === undefined && status === undefined) {
              throw new ApiError('bad_request', 'Envía observations, conclusion o status para actualizar el experimento.')
            }
            sendJson(res, 200, await updateExperimentResult(context, experimentId, { observations, conclusion, status }))
            return
          }
          methodNotAllowed(['GET', 'PATCH'])
        }

        if (segments.length === 3 && third === 'changes') {
          if (method !== 'POST') methodNotAllowed(['POST'])
          const experimentId = parseUuid(second, 'experimentId')
          const body = requireBody(req.body)
          const parameterId = parseUuid(body.parameterId, 'parameterId')
          if (body.newValue === undefined) throw new ApiError('bad_request', '«newValue» es obligatorio.')
          const apply = body.apply === undefined ? false : body.apply
          if (typeof apply !== 'boolean') throw new ApiError('bad_request', '«apply» debe ser booleano.')

          const reason = optionalText(body.reason, 'reason', 200) ?? null
          const observation = optionalText(body.observation, 'observation', 300) ?? null

          const configurationId = await getExperimentConfigurationId(context, experimentId)
          const versionId = await getConfigurationVersionId(context, configurationId)
          const { parameter, versionId: parameterVersionId } = await getParameterWithNode(context, parameterId)
          if (parameterVersionId !== versionId) {
            throw new ApiError('bad_request', 'El parámetro no pertenece a la versión del experimento.')
          }
          if (!valueMatchesType(parameter.dataType as DataTypeValue, body.newValue, parameter.allowedValues ?? null)) {
            throw new ApiError('bad_request', `«newValue» no coincide con el tipo «${parameter.dataType}» del parámetro.`)
          }

          const previousValue = await getCurrentConfigurationValue(context, configurationId, parameterId)
          const pathSnapshot = await nodePath(context, versionId, parameter.nodeId)

          // Con `apply: true` se actualiza el perfil; después se registra el
          // cambio append-only. Sin la marca, solo queda constancia (D-031).
          if (apply) await applyConfigurationValue(context, configurationId, parameterId, body.newValue)

          const change = await insertParameterChange(context, {
            experimentId,
            parameterId,
            previousValue,
            newValue: body.newValue,
            reason,
            observation,
            pathSnapshot,
            appliedToProfile: apply,
          })
          sendJson(res, 201, change)
          return
        }

        throw new ApiError('not_found', 'Ruta de experimentos no encontrada.')
      }

      /* ── Recomendaciones IA ──────────────────────────────────────────── */
      case 'ai': {
        if (segments.length !== 2 || second !== 'recommendations') {
          throw new ApiError('not_found', 'Ruta de IA no encontrada.')
        }
        if (method !== 'POST') methodNotAllowed(['POST'])

        const body = requireBody(req.body)
        const versionId = parseUuid(body.versionId, 'versionId')
        const title = requiredText(body.title, 'title', 160)
        const reasoningSummary = optionalText(body.reasoningSummary, 'reasoningSummary', 2_000) ?? null
        const suggestedChanges = parseSuggestedChanges(body.suggestedChanges)
        const configurationId = body.configurationId ? parseUuid(body.configurationId, 'configurationId') : null
        const experimentId = body.experimentId ? parseUuid(body.experimentId, 'experimentId') : null

        if (configurationId && (await getConfigurationVersionId(context, configurationId)) !== versionId) {
          throw new ApiError('bad_request', 'El perfil no pertenece a esa versión.')
        }
        if (experimentId) {
          const experimentConfigurationId = await getExperimentConfigurationId(context, experimentId)
          if ((await getConfigurationVersionId(context, experimentConfigurationId)) !== versionId) {
            throw new ApiError('bad_request', 'El experimento no pertenece a esa versión.')
          }
        }

        const recommendation = await createRecommendation(context, {
          versionId,
          configurationId,
          experimentId,
          title,
          reasoningSummary,
          suggestedChanges,
        })
        sendJson(res, 201, recommendation)
        return
      }

      default:
        throw new ApiError('not_found', 'Ruta no encontrada. Consulta docs/API.md.')
    }
  } catch (error) {
    // Solo registramos errores inesperados; los 4xx son parte del contrato.
    if (!(error instanceof ApiError)) console.error('[api]', error)
    sendError(res, toApiError(error))
  }
}
