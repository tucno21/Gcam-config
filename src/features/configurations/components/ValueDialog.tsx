import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/common/Button'
import { Dialog } from '../../../components/common/Dialog'
import { FormField } from '../../../components/forms/FormField'
import { toAppError } from '../../../lib/errors/AppError'
import { configurationService } from '../../../services/configurationService'
import type { Configuration, Parameter } from '../../../services/types'
import { TypedValueEditor } from '../../parameters/components/TypedValueEditor'
import { DATA_TYPE_LABEL, formatDefaultValue } from '../../parameters/valueFormat'
import { parseDefaultValue, formatValueForInput } from '../../parameters/validation'

type ValueDialogProps = {
  open: boolean
  configuration: Configuration
  parameter: Parameter
  /** Valor actual del perfil; `null` = sin valor personalizado. */
  currentValue: unknown
  onClose: () => void
  onSaved: (result: { cleared: boolean }) => void
}

/**
 * Define o quita el valor de un parámetro en un perfil.
 * Vaciar el campo quita el valor personalizado (vuelve a «sin valor»);
 * el valor predeterminado del catálogo nunca se modifica.
 */
export const ValueDialog = ({ open, configuration, parameter, currentValue, onClose, onSaved }: ValueDialogProps) => {
  const hasValue = currentValue !== null && currentValue !== undefined
  const [raw, setRaw] = useState(() => formatValueForInput(parameter.dataType, currentValue))
  const [error, setError] = useState<string | undefined>(undefined)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const parsed = parseDefaultValue(parameter.dataType, raw, parameter.allowedValues ?? [])
    if (parsed.error) {
      setError(parsed.error)
      return
    }
    setError(undefined)

    setSaving(true)
    try {
      if (parsed.value === null) {
        if (hasValue) await configurationService.clearValue(configuration.id, parameter.id)
        onSaved({ cleared: true })
      } else {
        await configurationService.setValue({
          configurationId: configuration.id,
          parameterId: parameter.id,
          value: parsed.value,
        })
        onSaved({ cleared: false })
      }
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
      title={`Valor en «${configuration.name}»`}
      description={`${parameter.name} · ${DATA_TYPE_LABEL[parameter.dataType]}`}
    >
      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit} noValidate>
        <div className="rounded-control border border-line bg-surface-sunken px-4 py-3 text-xs leading-relaxed text-ink-muted">
          Predeterminado documentado: <strong className="text-ink">{formatDefaultValue(parameter)}</strong>. Este valor
          no se modifica al guardar el perfil.
        </div>

        <FormField
          id="value-editor"
          label="Valor del perfil"
          hint="Vacío = sin valor personalizado (no se materializa el predeterminado)."
          error={error}
        >
          <TypedValueEditor
            id="value-editor"
            dataType={parameter.dataType}
            value={raw}
            allowedValues={parameter.allowedValues ?? []}
            error={error}
            onChange={(next) => {
              setRaw(next)
              setError(undefined)
            }}
          />
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
