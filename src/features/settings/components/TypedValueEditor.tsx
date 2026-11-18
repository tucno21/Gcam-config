import { Input } from '../../../components/forms/Input'
import { Select } from '../../../components/forms/Select'
import { Textarea } from '../../../components/forms/Textarea'
import type { DataType } from '../../../services/types'

type TypedValueEditorProps = {
  /** Debe coincidir con el `id` del `FormField` que lo envuelve. */
  id: string
  dataType: DataType
  /** Valor en bruto tal como lo escribe el usuario. */
  value: string
  /** Opciones del enum (solo aplica a `enum`). */
  allowedValues?: string[]
  error?: string
  disabled?: boolean
  onChange: (raw: string) => void
}

/**
 * Control de valor según el tipo del parámetro, sin conversiones implícitas:
 * los parseos reales los hace `parseDefaultValue` (validación pura).
 */
export const TypedValueEditor = ({
  id,
  dataType,
  value,
  allowedValues = [],
  error,
  disabled,
  onChange,
}: TypedValueEditorProps) => {
  const shared = {
    id,
    'aria-invalid': Boolean(error) || undefined,
    'aria-describedby': error ? `${id}-error` : `${id}-hint`,
    disabled,
  }

  switch (dataType) {
    case 'integer':
      return <Input {...shared} inputMode="numeric" placeholder="Ej. 100 (vacío = desconocido)" value={value} onChange={(event) => onChange(event.target.value)} />
    case 'decimal':
      return <Input {...shared} inputMode="decimal" placeholder="Ej. 1.5 (vacío = desconocido)" value={value} onChange={(event) => onChange(event.target.value)} />
    case 'boolean':
      return (
        <Select {...shared} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Desconocido</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </Select>
      )
    case 'enum':
      return (
        <Select {...shared} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled || allowedValues.length === 0}>
          <option value="">{allowedValues.length === 0 ? 'Sin opciones definidas' : 'Desconocido'}</option>
          {allowedValues.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      )
    case 'json':
      return (
        <Textarea
          {...shared}
          rows={3}
          className="font-mono text-[12px]"
          placeholder='Ej. {"key": "valor"}'
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    case 'string':
      return <Input {...shared} placeholder="Texto libre (vacío = desconocido)" value={value} onChange={(event) => onChange(event.target.value)} />
  }
}
