import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/helpers/cn'
import { IconButton } from './IconButton'

export type ActionMenuItem = {
  key: string
  label: string
  icon: LucideIcon
  onSelect: () => void
  tone?: 'default' | 'danger'
}

type ActionMenuProps = {
  /** Nombre accesible del menú, p. ej. «Acciones de Sharpness». */
  label: string
  items: ActionMenuItem[]
  className?: string
}

/**
 * Menú de acciones en un solo botón de tres puntos.
 * Se cierra al pulsar fuera o con `Escape`; el foco vuelve al botón.
 */
export const ActionMenu = ({ label, items, className }: ActionMenuProps) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()

    const close = () => setOpen(false)
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close()
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      containerRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative shrink-0', className)}>
      <IconButton
        label={label}
        tooltip={false}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreVertical aria-hidden="true" className="size-4" />
      </IconButton>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          className="absolute top-full right-0 z-50 mt-1 w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-panel border border-line-strong bg-surface-raised py-1 shadow-xl"
        >
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors',
                  item.tone === 'danger'
                    ? 'text-danger hover:bg-danger/10'
                    : 'text-ink-muted hover:bg-white/[0.05] hover:text-ink',
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
