import { ArrowRight } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../../components/common/Badge'
import { Panel } from '../../../components/common/Panel'
import { VERSION_TABS } from '../../../lib/constants/versionSections'
import { VersionSection } from '../components/VersionSection'

export const VersionOverviewPage = () => {
  const { cameraId, versionId } = useParams()
  const base = `/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}`
  const sections = VERSION_TABS.filter((tab) => tab.key !== '')

  return (
    <VersionSection
      title="Resumen"
      description="Una versión conserva su propia estructura de parámetros, sus perfiles de configuración y sus experimentos."
    >
      <Panel title="Secciones de la versión" description="Todo lo que sigue trabaja sobre esta versión." flush>
        <ul className="divide-y divide-line">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <li key={section.key}>
                <Link
                  to={`${base}/${section.key}`}
                  className="group flex items-start gap-4 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.03]"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-surface-sunken text-ink-faint transition-colors group-hover:text-ink">
                    <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink">{section.label}</span>
                      <Badge>Etapa {String(section.stage).padStart(2, '0')}</Badge>
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">{section.description}</span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-2.5 size-4 shrink-0 text-ink-disabled transition-[transform,color] duration-150 group-hover:translate-x-0.5 group-hover:text-ink-muted"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </Panel>
    </VersionSection>
  )
}
