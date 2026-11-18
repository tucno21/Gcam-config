import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { Select } from '../../../components/forms/Select'
import { Textarea } from '../../../components/forms/Textarea'
import { toAppError } from '../../../lib/errors/AppError'
import { historyService } from '../../../services/historyService'
import type { CurrentValueSource, Parameter } from '../../../services/types'
import { formatValueForInput } from '../validation'
import { EFFECT_OPTIONS, formatCurrentValueWithUnit, formatDefaultValue } from '../valueFormat'
import type { EffectValue } from '../valueFormat'
import { toCurrentValue, validateValueChange } from '../validation'
import { TypedValueEditor } from './TypedValueEditor'

type ValueDialogProps = {
  open: boolean
  parameter: Parameter
  /** Ruta del parámetro en el momento del cambio (se congela en el historial). */
  path: string[]
  onClose: () => void
  onSaved: () => void
}

/**
 * Cambio del valor actual. El comentario es opcional pero se pide en el mismo
 * paso: es lo que convierte el historial en conocimiento («subí esto y empeoró»).
 */
export const ValueDialog = ({ open, parameter, path, onClose, onSaved }: ValueDialogProps) => {
  const [source, setSource] = useState<CurrentValueSource>(() =>
    parameter.currentValueSource === 'unknown' ? 'custom' : parameter.currentValueSource,
  )
  const [raw, setRaw] = useState(() => formatValueForInput(parameter.dataType, parameter.currentValue))
  const [comment, setComment] = useState('')
  const [effect, setEffect] = useState<'' | EffectValue>('')
  const [errors, setErrors] = useState<{ raw?: string; comment?: string }>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const values = { raw, source, comment, effect }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    const nextErrors = validateValueChange(parameter, values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const next = toCurrentValue(parameter, values)
      await historyService.applyValue({
        parameter,
        value: next.value,
        source: next.source,
        comment: comment.trim() || null,
        effect: effect === '' ? null : effect,
        path,
      })
      onSaved()
      onClose()
    } catch (cause) {
      setFormError(toAppError(cause).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={`Cambiar «${parameter.name}»`}
      description={`Ahora: ${formatCurrentValueWithUnit(parameter)} · Predeterminado: ${formatDefaultValue(parameter)}`}
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <FormField
          id="value-source"
          label="Valor actual"
          hint="«Default (From Library)» = el valor de fábrica que muestra GCam."
        >
          <Select
            id="value-source"
            value={source}
            onChange={(event) => setSource(event.target.value as CurrentValueSource)}
            disabled={saving}
          >
            <option value="custom">Definido a mano</option>
            <option value="default">Default (From Library)</option>
            <option value="unknown">Sin valor</option>
          </Select>
        </FormField>

        {source === 'custom' && (
          <FormField
            id="value-current"
            label="Nuevo valor"
            error={errors.raw}
            required
            hint={parameter.unit ? `Unidad: ${parameter.unit}` : undefined}
          >
            <TypedValueEditor
              id="value-current"
              dataType={parameter.dataType}
              value={raw}
              allowedValues={parameter.allowedValues ?? []}
              error={errors.raw}
              disabled={saving}
              onChange={setRaw}
            />
          </FormField>
        )}

        <FormField
          id="value-comment"
          label="Comentario del cambio"
          hint="Opcional. Qué tocaste, por qué y qué esperabas."
          error={errors.comment}
        >
          <Textarea
            id="value-comment"
            rows={3}
            value={comment}
            invalid={Boolean(errors.comment)}
            aria-describedby={errors.comment ? 'value-comment-error' : 'value-comment-hint'}
            placeholder="Ej. Subí a 1.375 para recuperar detalle; revisar ruido en sombra."
            onChange={(event) => setComment(event.target.value)}
            disabled={saving}
          />
        </FormField>

        <FormField id="value-effect" label="Efecto observado" hint="Opcional. Puedes marcarlo después.">
          <Select
            id="value-effect"
            value={effect}
            onChange={(event) => setEffect(event.target.value as '' | EffectValue)}
            disabled={saving}
          >
            {EFFECT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

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
            Guardar valor
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
