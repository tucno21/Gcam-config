import { Badge } from '../common/Badge'
import { Panel } from '../common/Panel'

type PendingStageProps = {
  stage: number
  title: string
  description: string
  /** Alcance previsto, en una línea por punto. */
  items?: string[]
}

/**
 * Marcador honesto de una sección que aún no está construida: explica qué habrá
 * aquí y en qué etapa llega. Se sustituye por la vista real en su etapa.
 */
export const PendingStage = ({ stage, title, description, items }: PendingStageProps) => (
  <Panel>
    <div className="flex flex-wrap items-center gap-3">
      <Badge tone="accent">Etapa {String(stage).padStart(2, '0')}</Badge>
      <span className="text-xs text-ink-faint">Pendiente de implementación</span>
    </div>
    <h2 className="mt-4 text-lg font-medium tracking-tight text-ink">{title}</h2>
    <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted text-pretty">{description}</p>
    {items && items.length > 0 && (
      <ul className="mt-6 grid gap-x-8 gap-y-2.5 border-t border-line pt-5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-muted">
            <span aria-hidden="true" className="mt-2 h-px w-2.5 shrink-0 bg-line-strong" />
            {item}
          </li>
        ))}
      </ul>
    )}
  </Panel>
)
