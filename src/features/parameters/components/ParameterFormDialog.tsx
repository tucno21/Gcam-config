import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { Input } from '../../../components/forms/Input'
import { Select } from '../../../components/forms/Select'
import { Textarea } from '../../../components/forms/Textarea'
import { toAppError } from '../../../lib/errors/AppError'
import { parameterService } from '../../../services/parameterService'
import type { ConfidenceLevel, DataType, DefaultValueSource, Parameter, ParameterNode } from '../../../services/types'
import {
  CONFIDENCE_OPTIONS,
  DATA_TYPE_OPTIONS,
  DEFAULT_VALUE_SOURCE_OPTIONS,
  parseAllowedValues,
  parameterToFormValues,
  toParameterPayload,
  validateParameterField,
  validateParameterForm,
} from '../validation'
import type { ParameterField, ParameterFieldErrors, ParameterFormValues } from '../validation'
import { TypedValueEditor } from './TypedValueEditor'

type ParameterFormDialogProps = {
  open: boolean
  node: ParameterNode
  /** `null` = nuevo parámetro; con valor, edición. */
  parameter: Parameter | null
  onClose: () => void
  onSaved: (parameter: Parameter, mode: 'create' | 'edit') => void
}

/** Alta y edición de parámetros dentro de un nodo. */
export const ParameterFormDialog = ({ open, node, parameter, onClose, onSaved }: ParameterFormDialogProps) => {
  const isEdit = parameter !== null

  // El padre remonta al abrir (key): estado limpio sin efectos.
  const [values, setValues] = useState<ParameterFormValues>(() => parameterToFormValues(parameter))
  const [errors, setErrors] = useState<ParameterFieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const setField = (field: keyof ParameterFormValues, value: string | boolean) => {
    const next = { ...values, [field]: value } as ParameterFormValues
    // Cambiar de tipo deja el valor previo inválido: se limpia.
    if (field === 'dataType' && value !== values.dataType) {
      next.defaultValueRaw = ''
      next.allowedValuesRaw = value === 'enum' ? values.allowedValuesRaw : ''
      if (value === 'enum' && next.defaultValueSource === 'unknown') next.defaultValueSource = 'documentation'
    }
    setValues(next)
    if (['name', 'key', 'description', 'unit', 'sortOrder', 'allowedValues', 'source', 'defaultValue'].includes(field)) {
      setErrors((previous) => ({ ...previous, [field]: validateParameterField(field as ParameterField, next) }))
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const nextErrors = validateParameterForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const payload = toParameterPayload(values)
      const saved = isEdit
        ? await parameterService.update(parameter.id, payload)
        : await parameterService.create({ nodeId: node.id, ...payload })

      onSaved(saved, isEdit ? 'edit' : 'create')
      onClose()
    } catch (cause) {
      const appError = toAppError(cause)
      setFormError(
        appError.code === 'conflict'
          ? 'Ya existe un parámetro con esa clave en este nodo.'
          : appError.message,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={isEdit ? 'Editar parámetro' : `Nuevo parámetro en «${node.name}»`}
      description="El valor predeterminado es documentación de referencia: los perfiles no lo modifican."
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="parameter-name" label="Nombre" error={errors.name} required>
            <Input
              id="parameter-name"
              value={values.name}
              invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'parameter-name-error' : undefined}
              maxLength={120}
              autoComplete="off"
              placeholder="Ej. Max Frames"
              onChange={(event) => setField('name', event.target.value)}
              onBlur={() => setErrors((previous) => ({ ...previous, name: validateParameterField('name', values) }))}
              disabled={saving}
            />
          </FormField>

          <FormField id="parameter-key" label="Clave técnica" hint="Si se conoce. Única dentro del nodo." error={errors.key}>
            <Input
              id="parameter-key"
              value={values.key}
              invalid={Boolean(errors.key)}
              aria-describedby={errors.key ? 'parameter-key-error' : 'parameter-key-hint'}
              maxLength={80}
              autoComplete="off"
              className="font-mono text-[13px]"
              placeholder="max_frames"
              onChange={(event) => setField('key', event.target.value)}
              onBlur={() => setErrors((previous) => ({ ...previous, key: validateParameterField('key', values) }))}
              disabled={saving}
            />
          </FormField>
        </div>

        <FormField id="parameter-description" label="Descripción / observaciones" error={errors.description}>
          <Textarea
            id="parameter-description"
            rows={2}
            value={values.description}
            invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'parameter-description-error' : undefined}
            placeholder="Qué controla y cualquier observación."
            onChange={(event) => setField('description', event.target.value)}
            disabled={saving}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="parameter-type" label="Tipo de dato" hint={DATA_TYPE_OPTIONS.find((option) => option.value === values.dataType)?.hint}>
            <Select
              id="parameter-type"
              value={values.dataType}
              disabled={saving}
              onChange={(event) => setField('dataType', event.target.value as DataType)}
            >
              {DATA_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id="parameter-unit" label="Unidad" error={errors.unit}>
            <Input
              id="parameter-unit"
              value={values.unit}
              maxLength={24}
              placeholder="Opcional. Ej. ms, KB, %"
              onChange={(event) => setField('unit', event.target.value)}
              disabled={saving}
            />
          </FormField>
        </div>

        {values.dataType === 'enum' && (
          <FormField
            id="parameter-allowed"
            label="Opciones permitidas"
            hint="Una por línea (o separadas por comas)."
            error={errors.allowedValues}
            required
          >
            <Textarea
              id="parameter-allowed"
              rows={3}
              value={values.allowedValuesRaw}
              invalid={Boolean(errors.allowedValues)}
              aria-describedby={errors.allowedValues ? 'parameter-allowed-error' : 'parameter-allowed-hint'}
              placeholder={'on\noff'}
              onChange={(event) => setField('allowedValuesRaw', event.target.value)}
              disabled={saving}
            />
          </FormField>
        )}

        <div className="rounded-panel border border-line bg-surface-sunken p-4">
          <p className="ui-label">Valor predeterminado (documentación)</p>
          <div className="mt-3 space-y-4">
            <FormField
              id="parameter-default"
              label="Valor"
              hint="Vacío = desconocido. No se inventa un valor."
              error={errors.defaultValue}
            >
              <TypedValueEditor
                id="parameter-default"
                dataType={values.dataType}
                value={values.defaultValueRaw}
                allowedValues={parseAllowedValues(values.allowedValuesRaw)}
                error={errors.defaultValue}
                onChange={(raw) => setField('defaultValueRaw', raw)}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="parameter-source" label="Procedencia" error={errors.source} required={values.defaultValueRaw.trim().length > 0}>
                <Select
                  id="parameter-source"
                  value={values.defaultValueSource}
                  invalid={Boolean(errors.source)}
                  onChange={(event) => setField('defaultValueSource', event.target.value as DefaultValueSource)}
                  disabled={saving}
                >
                  {DEFAULT_VALUE_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField id="parameter-confidence" label="Certeza" hint="Opcional.">
                <Select
                  id="parameter-confidence"
                  value={values.defaultValueConfidence}
                  onChange={(event) => setField('defaultValueConfidence', event.target.value as '' | ConfidenceLevel)}
                  disabled={saving}
                >
                  {CONFIDENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="parameter-order" label="Orden" hint="Entre los parámetros del nodo." error={errors.sortOrder}>
            <Input
              id="parameter-order"
              inputMode="numeric"
              value={values.sortOrder}
              invalid={Boolean(errors.sortOrder)}
              onChange={(event) => setField('sortOrder', event.target.value)}
              disabled={saving}
            />
          </FormField>

          <label className="mt-6 flex items-start gap-3 rounded-control border border-line bg-surface-sunken px-4 py-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
              checked={values.isActive}
              onChange={(event) => setField('isActive', event.target.checked)}
              disabled={saving}
            />
            <span className="text-[13px] leading-relaxed text-ink-muted">
              Activo
              <span className="mt-0.5 block text-xs text-ink-faint">Los inactivos se conservan pero no se usan.</span>
            </span>
          </label>
        </div>

        {formError && (
          <p role="alert" className="text-xs leading-relaxed text-danger">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {isEdit ? 'Guardar cambios' : 'Crear parámetro'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
