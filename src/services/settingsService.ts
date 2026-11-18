import { getSupabase } from '../lib/supabase/client'
import { toAppError } from '../lib/errors/AppError'
import { nodeService } from './nodeService'
import { parameterService } from './parameterService'
import type { ParameterNode } from './types'

/**
 * Operaciones del espejo de ajustes que combinan árbol y parámetros.
 *
 * Contrato:
 * - `duplicateBranch` copia un nivel con todo su subárbol **dentro de la misma
 *   versión**. La copia es un nivel nuevo: nombres con sufijo «(copia)» en la
 *   raíz y `lineage_id` nuevos (el linaje identifica el mismo ajuste entre
 *   versiones, no una copia).
 * - Los valores actuales y las notas se copian: duplicar un nivel es para
 *   reorganizar o repetir un grupo, no para vaciarlo.
 * - Nunca mueve ni borra datos del origen.
 */
export const settingsService = {
  async duplicateBranch(nodeId: string): Promise<{ nodes: number; parameters: number }> {
    try {
      const source = await nodeService.getById(nodeId)
      const { items: nodes } = await nodeService.listByVersion(source.cameraVersionId)
      const parameters = await parameterService.listByVersion(source.cameraVersionId)

      const childrenOf = new Map<string | null, ParameterNode[]>()
      for (const node of nodes) {
        const siblings = childrenOf.get(node.parentId) ?? []
        siblings.push(node)
        childrenOf.set(node.parentId, siblings)
      }

      const parametersByNode = new Map<string, typeof parameters>()
      for (const parameter of parameters) {
        const list = parametersByNode.get(parameter.nodeId) ?? []
        list.push(parameter)
        parametersByNode.set(parameter.nodeId, list)
      }

      let createdNodes = 0
      let createdParameters = 0
      const idMap = new Map<string, string>()

      const copyNode = async (original: ParameterNode, parentId: string | null, isRoot: boolean, siblingsNames?: Set<string>): Promise<void> => {
        const copy = await nodeService.create({
          cameraVersionId: original.cameraVersionId,
          parentId,
          name: isRoot ? this.copyName(original.name, siblingsNames ?? new Set()) : original.name,
          description: original.description,
          nodeType: original.nodeType,
          sortOrder: isRoot ? (await this.nextRootOrder(original)) : original.sortOrder,
          isActive: original.isActive,
        })
        createdNodes += 1
        idMap.set(original.id, copy.id)

        for (const parameter of parametersByNode.get(original.id) ?? []) {
          await parameterService.create({
            nodeId: copy.id,
            name: parameter.name,
            key: parameter.key,
            description: parameter.description,
            notes: parameter.notes,
            dataType: parameter.dataType,
            unit: parameter.unit,
            defaultValue: parameter.defaultValue ?? undefined,
            defaultValueSource: parameter.defaultValueSource,
            defaultValueConfidence: parameter.defaultValueConfidence,
            allowedValues: parameter.allowedValues,
            sortOrder: parameter.sortOrder,
            isActive: parameter.isActive,
            currentValue: parameter.currentValue ?? null,
            currentValueSource: parameter.currentValueSource,
          })
          createdParameters += 1
        }

        for (const child of childrenOf.get(original.id) ?? []) {
          await copyNode(child, copy.id, false)
        }
      }

      await copyNode(
        source,
        source.parentId,
        true,
        new Set((childrenOf.get(source.parentId) ?? []).map((node) => node.name)),
      )

      return { nodes: createdNodes, parameters: createdParameters }
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** «Foto (copia)», «Foto (copia 2)»… sin chocar con los hermanos existentes. */
  copyName(name: string, taken: Set<string>): string {
    const base = `${name} (copia)`
    if (!taken.has(base)) return base
    let index = 2
    while (taken.has(`${name} (copia ${index})`)) index += 1
    return `${name} (copia ${index})`
  },

  /** Orden para la copia: al final de los hermanos del nivel original. */
  async nextRootOrder(node: ParameterNode): Promise<number> {
    let query = getSupabase()
      .from('parameter_nodes')
      .select('sort_order')
      .eq('camera_version_id', node.cameraVersionId)

    query = node.parentId === null ? query.is('parent_id', null) : query.eq('parent_id', node.parentId)

    const { data, error } = await query
      .order('sort_order', { ascending: false })
      .limit(1)
      .returns<Array<{ sort_order: number }>>()

    if (error) throw error
    return (data?.[0]?.sort_order ?? -1) + 1
  },

  /** Duplica un parámetro al final de su nivel, con linaje nuevo. */
  async duplicateParameter(parameterId: string): Promise<{ name: string }> {
    try {
      const parameter = await parameterService.getById(parameterId)
      const siblings = await parameterService.listByNode(parameter.nodeId, { includeInactive: true })
      const nextOrder = siblings.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1

      const copy = await parameterService.create({
        nodeId: parameter.nodeId,
        name: `${parameter.name} (copia)`,
        description: parameter.description,
        notes: parameter.notes,
        dataType: parameter.dataType,
        unit: parameter.unit,
        defaultValue: parameter.defaultValue ?? undefined,
        defaultValueSource: parameter.defaultValueSource,
        defaultValueConfidence: parameter.defaultValueConfidence,
        allowedValues: parameter.allowedValues,
        currentValue: parameter.currentValue ?? null,
        currentValueSource: parameter.currentValueSource,
        sortOrder: nextOrder,
        isActive: true,
      })

      return { name: copy.name }
    } catch (error) {
      throw toAppError(error)
    }
  },
}
