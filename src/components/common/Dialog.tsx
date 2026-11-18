import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/helpers/cn'
import { IconButton } from './IconButton'

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** El contenido ya trae su propia cabecera; se usa `title` como nombre accesible. */
  hideHeader?: boolean
  /** `center` para diálogos, `left` para el panel de navegación móvil. */
  placement?: 'center' | 'left'
  panelClassName?: string
}

/**
 * Diálogo modal sobre `<dialog>` nativo: foco atrapado, Escape y backdrop gratis.
 * El propio `<dialog>` ocupa la ventana y el panel visual vive dentro, de modo que
 * el clic en el área vacía cierra sin pelear con utilidades de Tailwind.
 */
export const Dialog = ({
  open,
  onClose,
  title,
  description,
  children,
  hideHeader = false,
  placement = 'center',
  panelClassName,
}: DialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // El foco arranca en el panel, no en el primer botón.
      panelRef.current?.focus({ preventScroll: true })
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={hideHeader ? undefined : titleId}
      aria-describedby={!hideHeader && description ? descriptionId : undefined}
      aria-label={hideHeader ? title : undefined}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="fixed inset-0 z-50 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-ink"
    >
      <div
        className={cn(
          'flex w-full',
          placement === 'center' ? 'min-h-full items-center justify-center p-4' : 'h-full items-stretch justify-start',
        )}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          className={cn(
            'flex flex-col border-line-strong bg-surface outline-none',
            placement === 'center'
              ? 'max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-dialog border'
              : 'h-full w-[min(19rem,86vw)] overflow-y-auto border-r',
            panelClassName,
          )}
        >
          {!hideHeader && (
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-medium tracking-tight text-ink">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-ink-faint">
                    {description}
                  </p>
                )}
              </div>
              <IconButton label="Cerrar" onClick={onClose}>
                <X className="size-4" />
              </IconButton>
            </header>
          )}
          {children}
        </div>
      </div>
    </dialog>
  )
}
