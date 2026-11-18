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
import type { ParameterField, ParameterFormValues } from '../validation'
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
import { TypedValueEditor } from './TypedValueEditor'

type ParameterDialogProps = {
  open: boolean
  node: ParameterNode
  /** `null` = nuevo. */
  parameter: Parameter | null
  onClose: () => void
  onSaved: (parameter: Parameter, mode: 'create' | 'edit') => void
}

/** Alta y edición de la definición de un parámetro (sin tocar el valor actual). */
export const ParameterDialog = ({ open, node, parameter, onClose, onSaved }: ParameterDialogProps) => {
  const isEdit = parameter !== null
  const [values, setValues] = useState<ParameterFormValues>(() => parameterToFormValues(parameter))
  const [errors, setErrors] = useState<ReturnType<typeof validateParameterForm>>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showReference, setShowReference] = useState(
    () => Boolean(parameter && (parameter.defaultValue !== null || parameter.defaultValueSource !== 'unknown')),
  )

  const setField = (field: keyof ParameterFormValues, value: string | boolean) => {
    const next = { ...values, [field]: value } as ParameterFormValues
    if (field === 'dataType' && value !== values.dataType) {
      next.defaultValueRaw = ''
      next.allowedValuesRaw = value === 'enum' ? values.allowedValuesRaw : ''
    }
    setValues(next)
    if (['name', 'description', 'notes', 'unit', 'allowedValues', 'defaultValue', 'source'].includes(field)) {
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
      const error = toAppError(cause)
      setFormError(error.code === 'conflict' ? 'Ya existe un parámetro con ese nombre o clave en este nivel.' : error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={isEdit ? 'Editar parámetro' : `Nuevo parámetro en «${node.name}»`}
      description="Define el ajuste. El valor actual se cambia desde la lista, con su comentario."
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <FormField id="param-name" label="Nombre" error={errors.name} required>
          <Input
            id="param-name"
            value={values.name}
            invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'param-name-error' : undefined}
            maxLength={120}
            autoComplete="off"
            placeholder="Ej. Sharp Depth 1"
            onChange={(event) => setField('name', event.target.value)}
            onBlur={() => setErrors((previous) => ({ ...previous, name: validateParameterField('name', values) }))}
            disabled={saving}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="param-type"
            label="Tipo"
            hint={DATA_TYPE_OPTIONS.find((option) => option.value === values.dataType)?.hint}
          >
            <Select
              id="param-type"
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

          <FormField id="param-unit" label="Unidad" hint="Opcional." error={errors.unit}>
            <Input
              id="param-unit"
              value={values.unit}
              invalid={Boolean(errors.unit)}
              aria-describedby={errors.unit ? 'param-unit-error' : 'param-unit-hint'}
              maxLength={24}
              placeholder="Ej. %, ms"
              onChange={(event) => setField('unit', event.target.value)}
              disabled={saving}
            />
          </FormField>
        </div>

        {values.dataType === 'enum' && (
          <FormField
            id="param-allowed"
            label="Opciones"
            hint="Una por línea."
            error={errors.allowedValues}
            required
          >
            <Textarea
              id="param-allowed"
              rows={2}
              value={values.allowedValuesRaw}
              invalid={Boolean(errors.allowedValues)}
              aria-describedby={errors.allowedValues ? 'param-allowed-error' : 'param-allowed-hint'}
              placeholder={'on\noff'}
              onChange={(event) => setField('allowedValuesRaw', event.target.value)}
              disabled={saving}
            />
          </FormField>
        )}

        <FormField
          id="param-notes"
          label="Nota del parámetro"
          hint="Qué controla y qué has observado. Se conserva entre versiones."
          error={errors.notes}
        >
          <Textarea
            id="param-notes"
            rows={3}
            value={values.notes}
            invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? 'param-notes-error' : 'param-notes-hint'}
            placeholder="Ej. Subirlo da más nitidez, pero aparece ruido en sombra."
            onChange={(event) => setField('notes', event.target.value)}
            disabled={saving}
          />
        </FormField>

        <details
          className="rounded-control border border-line bg-surface-sunken px-4 py-3"
          open={showReference}
          onToggle={(event) => setShowReference((event.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-[13px] font-medium text-ink">
            Valor de referencia (opcional)
          </summary>
          <p className="mt-1 text-xs leading-relaxed text-ink-faint">
            Lo que trae la app de fábrica. Si no lo conoces, déjalo vacío: no se inventa.
          </p>
          <div className="mt-3 space-y-4">
            <FormField id="param-default" label="Valor predeterminado" error={errors.defaultValue}>
              <TypedValueEditor
                id="param-default"
                dataType={values.dataType}
                value={values.defaultValueRaw}
                allowedValues={parseAllowedValues(values.allowedValuesRaw)}
                error={errors.defaultValue}
                onChange={(raw) => setField('defaultValueRaw', raw)}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="param-source"
                label="Procedencia"
                error={errors.source}
                required={values.defaultValueRaw.trim().length > 0}
              >
                <Select
                  id="param-source"
                  value={values.defaultValueSource}
                  invalid={Boolean(errors.source)}
                  aria-describedby={errors.source ? 'param-source-error' : undefined}
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

              <FormField id="param-confidence" label="Certeza" hint="Opcional.">
                <Select
                  id="param-confidence"
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
        </details>

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
