import type { ReactNode } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  children: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` usa el botón destructivo. */
  tone?: 'default' | 'danger'
  loading?: boolean
}

/**
 * Confirmación genérica para acciones destructivas o delicadas.
 * La explicación del impacto la aporta quien la usa (`children`).
 */
export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  loading = false,
}: ConfirmDialogProps) => (
  <Dialog open={open} onClose={onClose} title={title} panelClassName="max-w-md">
    <div className="px-5 py-5">
      <div className="text-[13px] leading-relaxed text-ink-muted text-pretty">{children}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Dialog>
)
