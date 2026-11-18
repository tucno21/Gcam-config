import { toAppError, AppError } from '../lib/errors/AppError'
import { getSupabase } from '../lib/supabase/client'
import type {
  BackupChange,
  BackupConfiguration,
  BackupExperiment,
  BackupNode,
  BackupParameter,
  BackupValue,
  BackupVersion,
  CameraBackup,
  ProfileBackup,
} from '../features/cameras/exportSchema'
import { BACKUP_FORMAT, BACKUP_SCHEMA_VERSION, PROFILE_FORMAT } from '../features/cameras/exportSchema'

/**
 * Transferencia de respaldos (Etapa 13).
 *
 * - Exportación: lee la cámara completa (o un perfil) con columnas explícitas y
 *   devuelve el JSON documentado en `docs/IMPORT-EXPORT.md`.
 * - Importación: **siempre crea una cámara nueva**; no sobrescribe nada. Inserta
 *   primero padres y maestros, y después los hijos con los ids remapeados, para
 *   no perder relaciones. Las fechas de creación de experimentos e historial se
 *   conservan cuando el archivo las trae.
 * - Todo se ejecuta con el cliente autenticado: RLS sigue mandando.
 */

/* ── Filas ──────────────────────────────────────────────────────────────── */

type NodeRow = {
  id: string
  parent_id: string | null
  lineage_id: string
  name: string
  description: string | null
  node_type: BackupNode['nodeType']
  sort_order: number
  is_active: boolean
  created_at: string
}

type ParameterRow = {
  id: string
  node_id: string
  lineage_id: string
  key: string | null
  name: string
  description: string | null
  notes: string | null
  data_type: BackupParameter['dataType']
  unit: string | null
  default_value: unknown
  default_value_source: BackupParameter['defaultValueSource']
  default_value_confidence: BackupParameter['defaultValueConfidence']
  allowed_values: string[] | null
  current_value: unknown
  current_value_source: NonNullable<BackupParameter['currentValueSource']>
  sort_order: number
  is_active: boolean
  created_at: string
}

type ValueRow = { parameter_id: string; value: unknown; notes: string | null }

type ConfigurationRow = {
  id: string
  name: string
  description: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
  configuration_values: ValueRow[]
}

type ChangeRow = {
  parameter_id: string
  previous_value: unknown
  previous_value_source: BackupChange['previousValueSource']
  new_value: unknown
  new_value_source: BackupChange['newValueSource']
  reason: string | null
  observation: string | null
  effect: BackupChange['effect']
  path_snapshot: string[] | null
  applied_to_profile: boolean
  created_at: string
}

type ExperimentRow = {
  id: string
  configuration_id: string
  title: string
  objective: string | null
  hypothesis: string | null
  status: BackupExperiment['status']
  observations: string | null
  conclusion: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  parameter_changes: ChangeRow[]
}

type VersionRow = {
  id: string
  version: string
  release_label: string | null
  notes: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
}

const PARAMETER_COLUMNS =
  'id, node_id, lineage_id, key, name, description, notes, data_type, unit, default_value, default_value_source, default_value_confidence, allowed_values, current_value, current_value_source, sort_order, is_active, created_at'

/* ── Exportación ────────────────────────────────────────────────────────── */

export const catalogTransferService = {
  /** ¿Existe ya ese slug en la cuenta? (detección de duplicados al importar). */
  async cameraSlugExists(slug: string): Promise<boolean> {
    try {
      const { count, error } = await getSupabase()
        .from('cameras')
        .select('id', { count: 'exact', head: true })
        .eq('slug', slug.trim())
      if (error) throw error
      return (count ?? 0) > 0
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Respaldo completo de una cámara, opcionalmente con experimentos e historial. */
  async exportCamera(cameraId: string, options: { includeExperiments: boolean }): Promise<CameraBackup> {
    try {
      const client = getSupabase()

      const { data: cameraData, error: cameraError } = await client
        .from('cameras')
        .select('id, name, slug, description, developer, website_url, is_active')
        .eq('id', cameraId)
        .single()
      if (cameraError) throw cameraError
      const camera = cameraData as {
        name: string
        slug: string
        description: string | null
        developer: string | null
        website_url: string | null
        is_active: boolean
      }

      const { data: versionData, error: versionError } = await client
        .from('camera_versions')
        .select('id, version, release_label, notes, is_default, is_active, created_at')
        .eq('camera_id', cameraId)
        .order('is_default', { ascending: false })
        .order('version', { ascending: true })
        .limit(100)
      if (versionError) throw versionError
      const versions = (versionData ?? []) as VersionRow[]

      const backupVersions: BackupVersion[] = []

      for (const version of versions) {
        const [{ data: nodeData, error: nodeError }, { data: parameterData, error: parameterError }, { data: configurationData, error: configurationError }] =
          await Promise.all([
            client
              .from('parameter_nodes')
              .select('id, parent_id, lineage_id, name, description, node_type, sort_order, is_active, created_at')
              .eq('camera_version_id', version.id)
              .order('sort_order', { ascending: true })
              .limit(5_000),
            client
              .from('parameters')
              .select(`${PARAMETER_COLUMNS}, node:parameter_nodes!inner(camera_version_id)`)
              .eq('node.camera_version_id', version.id)
              .order('sort_order', { ascending: true })
              .limit(5_000),
            client
              .from('configurations')
              .select('id, name, description, is_default, is_active, created_at, configuration_values(parameter_id, value, notes)')
              .eq('camera_version_id', version.id)
              .order('is_default', { ascending: false })
              .order('name', { ascending: true })
              .limit(100),
          ])

        if (nodeError) throw nodeError
        if (parameterError) throw parameterError
        if (configurationError) throw configurationError

        const nodes = ((nodeData ?? []) as NodeRow[]).map((row) => ({
          id: row.id,
          parentId: row.parent_id,
          lineageId: row.lineage_id,
          name: row.name,
          description: row.description,
          nodeType: row.node_type,
          sortOrder: row.sort_order,
          isActive: row.is_active,
          createdAt: row.created_at,
        }))

        const parameters = ((parameterData ?? []) as ParameterRow[]).map((row) => ({
          id: row.id,
          nodeId: row.node_id,
          lineageId: row.lineage_id,
          key: row.key,
          name: row.name,
          description: row.description,
          notes: row.notes,
          dataType: row.data_type,
          unit: row.unit,
          defaultValue: row.default_value,
          defaultValueSource: row.default_value_source,
          defaultValueConfidence: row.default_value_confidence,
          allowedValues: row.allowed_values,
          currentValue: row.current_value,
          currentValueSource: row.current_value_source,
          sortOrder: row.sort_order,
          isActive: row.is_active,
          createdAt: row.created_at,
        }))

        const configurations: BackupConfiguration[] = ((configurationData ?? []) as ConfigurationRow[]).map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          isDefault: row.is_default,
          isActive: row.is_active,
          createdAt: row.created_at,
          values: (row.configuration_values ?? []).map((value) => ({
            parameterId: value.parameter_id,
            value: value.value,
            notes: value.notes,
          })),
        }))

        const experiments: BackupExperiment[] = []
        if (options.includeExperiments) {
          const configurationIds = configurations.map((configuration) => configuration.id)
          if (configurationIds.length > 0) {
            const { data: experimentData, error: experimentError } = await client
              .from('experiments')
              .select(
                'id, configuration_id, title, objective, hypothesis, status, observations, conclusion, started_at, completed_at, created_at, parameter_changes(parameter_id, previous_value, new_value, reason, observation, path_snapshot, applied_to_profile, created_at)',
              )
              .in('configuration_id', configurationIds)
              .order('created_at', { ascending: true })
              .limit(500)
            if (experimentError) throw experimentError

            for (const experiment of (experimentData ?? []) as ExperimentRow[]) {
              experiments.push({
                id: experiment.id,
                configurationId: experiment.configuration_id,
                title: experiment.title,
                objective: experiment.objective,
                hypothesis: experiment.hypothesis,
                status: experiment.status,
                observations: experiment.observations,
                conclusion: experiment.conclusion,
                startedAt: experiment.started_at,
                completedAt: experiment.completed_at,
                createdAt: experiment.created_at,
                changes: (experiment.parameter_changes ?? [])
                  .slice()
                  .sort((a, b) => a.created_at.localeCompare(b.created_at))
                  .map((change) => ({
                    parameterId: change.parameter_id,
                    previousValue: change.previous_value,
                    newValue: change.new_value,
                    reason: change.reason,
                    observation: change.observation,
                    pathSnapshot: change.path_snapshot,
                    appliedToProfile: change.applied_to_profile,
                    createdAt: change.created_at,
                  })),
              })
            }
          }
        }

        const history: BackupChange[] = []
        if (parameters.length > 0) {
          const { data: historyData, error: historyError } = await client
            .from('parameter_changes')
            .select(
              'parameter_id, previous_value, previous_value_source, new_value, new_value_source, reason, observation, effect, path_snapshot, applied_to_profile, created_at',
            )
            .in('parameter_id', parameters.map((parameter) => parameter.id))
            .order('created_at', { ascending: true })
            .limit(5_000)
          if (historyError) throw historyError

          for (const change of (historyData ?? []) as ChangeRow[]) {
            history.push({
              parameterId: change.parameter_id,
              previousValue: change.previous_value,
              previousValueSource: change.previous_value_source ?? null,
              newValue: change.new_value,
              newValueSource: change.new_value_source ?? null,
              reason: change.reason,
              observation: change.observation,
              effect: change.effect ?? null,
              pathSnapshot: change.path_snapshot,
              appliedToProfile: change.applied_to_profile,
              createdAt: change.created_at,
            })
          }
        }

        backupVersions.push({
          version: version.version,
          releaseLabel: version.release_label,
          notes: version.notes,
          isDefault: version.is_default,
          isActive: version.is_active,
          createdAt: version.created_at,
          nodes,
          parameters,
          configurations,
          experiments,
          history,
        })
      }

      return {
        format: BACKUP_FORMAT,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        camera: {
          name: camera.name,
          slug: camera.slug,
          description: camera.description,
          developer: camera.developer,
          websiteUrl: camera.website_url,
          isActive: camera.is_active,
        },
        versions: backupVersions,
      }
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Respaldo de un perfil concreto con los parámetros que usa (incluida la ruta). */
  async exportConfiguration(configurationId: string): Promise<ProfileBackup> {
    try {
      const client = getSupabase()

      const { data: configurationData, error: configurationError } = await client
        .from('configurations')
        .select('id, camera_version_id, name, description, is_default, is_active, created_at, configuration_values(parameter_id, value, notes)')
        .eq('id', configurationId)
        .single()
      if (configurationError) throw configurationError
      const configuration = configurationData as ConfigurationRow & { camera_version_id: string }

      const { data: versionData, error: versionError } = await client
        .from('camera_versions')
        .select('id, camera_id, version, camera:cameras(name, slug)')
        .eq('id', configuration.camera_version_id)
        .single()
      if (versionError) throw versionError
      const version = versionData as {
        version: string
        camera: { name: string; slug: string } | Array<{ name: string; slug: string }>
      }
      const camera = Array.isArray(version.camera) ? version.camera[0] : version.camera

      const { data: parameterData, error: parameterError } = await client
        .from('parameters')
        .select(`${PARAMETER_COLUMNS}, node:parameter_nodes!inner(camera_version_id)`)
        .eq('node.camera_version_id', configuration.camera_version_id)
        .order('sort_order', { ascending: true })
        .limit(5_000)
      if (parameterError) throw parameterError

      const { data: nodeData, error: nodeError } = await client
        .from('parameter_nodes')
        .select('id, parent_id, name')
        .eq('camera_version_id', configuration.camera_version_id)
        .limit(5_000)
      if (nodeError) throw nodeError

      const nodes = (nodeData ?? []) as Array<{ id: string; parent_id: string | null; name: string }>
      const byId = new Map(nodes.map((node) => [node.id, node]))
      const pathOf = (nodeId: string): string[] => {
        const path: string[] = []
        let current: string | null = nodeId
        let guard = 0
        while (current && guard < 100) {
          const node = byId.get(current)
          if (!node) break
          path.unshift(node.name)
          current = node.parent_id
          guard += 1
        }
        return path
      }

      const referenced = new Set((configuration.configuration_values ?? []).map((value) => value.parameter_id))
      const parameters = ((parameterData ?? []) as ParameterRow[])
        .filter((row) => referenced.has(row.id))
        .map((row) => ({
          id: row.id,
          nodeId: row.node_id,
          lineageId: row.lineage_id,
          key: row.key,
          name: row.name,
          description: row.description,
          notes: row.notes,
          dataType: row.data_type,
          unit: row.unit,
          defaultValue: row.default_value,
          defaultValueSource: row.default_value_source,
          defaultValueConfidence: row.default_value_confidence,
          allowedValues: row.allowed_values,
          currentValue: row.current_value,
          currentValueSource: row.current_value_source,
          sortOrder: row.sort_order,
          isActive: row.is_active,
          createdAt: row.created_at,
          path: pathOf(row.node_id),
        }))

      return {
        format: PROFILE_FORMAT,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        context: {
          cameraName: camera?.name ?? '',
          cameraSlug: camera?.slug ?? '',
          versionLabel: version.version,
        },
        configuration: {
          id: configuration.id,
          name: configuration.name,
          description: configuration.description,
          isDefault: configuration.is_default,
          isActive: configuration.is_active,
          createdAt: configuration.created_at,
          values: (configuration.configuration_values ?? []).map((value) => ({
            parameterId: value.parameter_id,
            value: value.value,
            notes: value.notes,
          })),
        },
        parameters,
        values: (configuration.configuration_values ?? []).map((value) => ({
          parameterId: value.parameter_id,
          value: value.value,
          notes: value.notes,
        })),
      }
    } catch (error) {
      throw toAppError(error)
    }
  },

  /**
   * Importa un respaldo creando una cámara nueva. Nunca sobrescribe datos
   * existentes: si el slug está ocupado, la base rechaza y se pide otro.
   */
  async importCameraBackup(
    backup: CameraBackup,
    options: { name: string; slug: string },
  ): Promise<{
    cameraId: string
    counts: { versions: number; nodes: number; parameters: number; configurations: number; values: number; experiments: number; changes: number }
  }> {
    try {
      const client = getSupabase()

      const { data: cameraData, error: cameraError } = await client
        .from('cameras')
        .insert({
          name: options.name.trim(),
          slug: options.slug.trim(),
          description: backup.camera.description,
          developer: backup.camera.developer,
          website_url: backup.camera.websiteUrl,
          is_active: backup.camera.isActive,
        })
        .select('id')
        .single()
      if (cameraError) throw cameraError
      const cameraId = (cameraData as { id: string }).id

      const counts = { versions: 0, nodes: 0, parameters: 0, configurations: 0, values: 0, experiments: 0, changes: 0 }

      for (const versionBackup of backup.versions) {
        const { data: versionData, error: versionError } = await client
          .from('camera_versions')
          .insert({
            camera_id: cameraId,
            version: versionBackup.version,
            release_label: versionBackup.releaseLabel,
            notes: versionBackup.notes,
            is_default: false,
            is_active: versionBackup.isActive,
            ...(versionBackup.createdAt ? { created_at: versionBackup.createdAt } : {}),
          })
          .select('id')
          .single()
        if (versionError) throw versionError
        const versionId = (versionData as { id: string }).id
        counts.versions += 1

        // Nodos: padres primero, con ids remapeados.
        const nodeMap = new Map<string, string>()
        const childrenByParent = new Map<string | null, BackupNode[]>()
        for (const node of versionBackup.nodes) {
          const siblings = childrenByParent.get(node.parentId) ?? []
          siblings.push(node)
          childrenByParent.set(node.parentId, siblings)
        }
        for (const siblings of childrenByParent.values()) siblings.sort((a, b) => a.sortOrder - b.sortOrder)

        const insertBranch = async (parentBackupId: string | null, parentId: string | null): Promise<void> => {
          for (const node of childrenByParent.get(parentBackupId) ?? []) {
            const { data, error } = await client
              .from('parameter_nodes')
              .insert({
                camera_version_id: versionId,
                parent_id: parentId,
                name: node.name,
                description: node.description,
                node_type: node.nodeType,
                sort_order: node.sortOrder,
                is_active: node.isActive ?? true,
                ...(node.lineageId ? { lineage_id: node.lineageId } : {}),
                ...(node.createdAt ? { created_at: node.createdAt } : {}),
              })
              .select('id')
              .single()
            if (error) throw error
            const newId = (data as { id: string }).id
            nodeMap.set(node.id, newId)
            counts.nodes += 1
            await insertBranch(node.id, newId)
          }
        }
        await insertBranch(null, null)

        // Parámetros
        const parameterMap = new Map<string, string>()
        for (const parameter of versionBackup.parameters) {
          const newNodeId = nodeMap.get(parameter.nodeId)
          if (!newNodeId) throw new AppError('validation', `El parámetro «${parameter.name}» apunta a un nodo inexistente.`)
          const { data, error } = await client
            .from('parameters')
            .insert({
              node_id: newNodeId,
              key: parameter.key,
              name: parameter.name,
              description: parameter.description,
              notes: parameter.notes ?? null,
              data_type: parameter.dataType,
              unit: parameter.unit,
              default_value: parameter.defaultValue,
              default_value_source: parameter.defaultValueSource,
              default_value_confidence: parameter.defaultValueConfidence,
              allowed_values: parameter.allowedValues,
              current_value: parameter.currentValue ?? null,
              current_value_source: parameter.currentValueSource ?? 'unknown',
              sort_order: parameter.sortOrder,
              is_active: parameter.isActive,
              ...(parameter.lineageId ? { lineage_id: parameter.lineageId } : {}),
              ...(parameter.createdAt ? { created_at: parameter.createdAt } : {}),
            })
            .select('id')
            .single()
          if (error) throw error
          parameterMap.set(parameter.id, (data as { id: string }).id)
          counts.parameters += 1
        }

        // Historial de valores (cambios sueltos del espejo de ajustes)
        for (const change of versionBackup.history ?? []) {
          const newParameterId = parameterMap.get(change.parameterId)
          if (!newParameterId) continue
          const { error } = await client.from('parameter_changes').insert({
            parameter_id: newParameterId,
            previous_value: change.previousValue ?? null,
            previous_value_source: change.previousValueSource ?? null,
            new_value: change.newValue ?? null,
            new_value_source: change.newValueSource ?? null,
            reason: change.reason,
            observation: change.observation,
            effect: change.effect ?? null,
            path_snapshot: change.pathSnapshot,
            applied_to_profile: change.appliedToProfile,
            ...(change.createdAt ? { created_at: change.createdAt } : {}),
          })
          if (error) throw error
          counts.changes += 1
        }

        // Perfiles y valores
        const configurationMap = new Map<string, string>()
        for (const configuration of versionBackup.configurations) {
          const { data, error } = await client
            .from('configurations')
            .insert({
              camera_version_id: versionId,
              name: configuration.name,
              description: configuration.description,
              is_default: false,
              is_active: configuration.isActive,
              ...(configuration.createdAt ? { created_at: configuration.createdAt } : {}),
            })
            .select('id')
            .single()
          if (error) throw error
          const newConfigurationId = (data as { id: string }).id
          configurationMap.set(configuration.id, newConfigurationId)
          counts.configurations += 1

          const values = configuration.values
            .map((value: BackupValue) => {
              const parameterId = parameterMap.get(value.parameterId)
              if (!parameterId) throw new AppError('validation', `El perfil «${configuration.name}» usa un parámetro inexistente.`)
              return { configuration_id: newConfigurationId, parameter_id: parameterId, value: value.value, notes: value.notes }
            })
            .filter(Boolean)

          for (let index = 0; index < values.length; index += 100) {
            const { error: valueError } = await client.from('configuration_values').insert(values.slice(index, index + 100))
            if (valueError) throw valueError
          }
          counts.values += values.length
        }

        // Experimentos e historial
        for (const experiment of versionBackup.experiments) {
          const configurationId = configurationMap.get(experiment.configurationId)
          if (!configurationId) throw new AppError('validation', `El experimento «${experiment.title}» apunta a un perfil inexistente.`)

          const { data, error } = await client
            .from('experiments')
            .insert({
              configuration_id: configurationId,
              title: experiment.title,
              objective: experiment.objective,
              hypothesis: experiment.hypothesis,
              status: experiment.status,
              observations: experiment.observations,
              conclusion: experiment.conclusion,
              started_at: experiment.startedAt,
              completed_at: experiment.completedAt,
              ...(experiment.createdAt ? { created_at: experiment.createdAt } : {}),
            })
            .select('id')
            .single()
          if (error) throw error
          const newExperimentId = (data as { id: string }).id
          counts.experiments += 1

          const changes = experiment.changes.map((change: BackupChange) => {
            const parameterId = parameterMap.get(change.parameterId)
            if (!parameterId) throw new AppError('validation', `El experimento «${experiment.title}» registra un parámetro inexistente.`)
            return {
              experiment_id: newExperimentId,
              parameter_id: parameterId,
              previous_value: change.previousValue ?? null,
              new_value: change.newValue,
              reason: change.reason,
              observation: change.observation,
              path_snapshot: change.pathSnapshot,
              applied_to_profile: change.appliedToProfile,
              ...(change.createdAt ? { created_at: change.createdAt } : {}),
            }
          })

          if (changes.length > 0) {
            const { error: changeError } = await client.from('parameter_changes').insert(changes)
            if (changeError) throw changeError
          }
          counts.changes += changes.length
        }

        // Predeterminados al final: la base solo permite uno por cámara/versión.
        if (versionBackup.isDefault) {
          const { error } = await client.from('camera_versions').update({ is_default: true }).eq('id', versionId)
          if (error) throw error
        }
        const defaultConfiguration = versionBackup.configurations.find((configuration) => configuration.isDefault)
        if (defaultConfiguration) {
          const newConfigurationId = configurationMap.get(defaultConfiguration.id)
          if (newConfigurationId) {
            const { error } = await client.from('configurations').update({ is_default: true }).eq('id', newConfigurationId)
            if (error) throw error
          }
        }
      }

      return { cameraId, counts }
    } catch (error) {
      throw toAppError(error)
    }
  },
}
