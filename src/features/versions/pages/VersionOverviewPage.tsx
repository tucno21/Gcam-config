import { ArrowRight } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../../components/common/Badge'
import { Panel } from '../../../components/common/Panel'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useWorkspaceSelection } from '../../../hooks/useWorkspaceSelection'
import { AppError } from '../../../lib/errors/AppError'
import { formatDateTime } from '../../../lib/helpers/formatDate'
import { VERSION_TABS } from '../../../lib/constants/versionSections'
import { versionService } from '../../../services/versionService'
import { VersionSection } from '../components/VersionSection'

/** Resumen de la versión: datos reales y acceso a las secciones del módulo. */
export const VersionOverviewPage = () => {
  const { cameraId, versionId } = useParams()
  useWorkspaceSelection(cameraId, versionId)

  const { status, data: version, error, reload } = useAsyncData(async () => {
    if (!versionId) throw new AppError('not_found', 'No se indicó la versión solicitada.')
    return versionService.getById(versionId)
  }, `version|${versionId}`)

  const sections = VERSION_TABS.filter((tab) => tab.key !== '')

  return (
    <VersionSection
      title="Resumen"
      description="Una versión conserva su propia estructura de ajustes y todo su historial."
    >
      {status === 'loading' && (
        <div className="flex items-center gap-2 px-1 py-4 text-sm text-ink-muted" role="status">
          <Spinner />
          <span>Cargando versión…</span>
        </div>
      )}

      {status === 'error' && error && (
        <ErrorState title="No se pudo cargar la versión" description={error.message} onRetry={reload} />
      )}

      {status === 'success' && version && (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel title="Datos de la versión" flush>
              <dl className="divide-y divide-line">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <dt className="ui-label w-32 shrink-0">Etiqueta</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <code className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[12px] text-ink-muted">
                      {version.version}
                    </code>
                    {version.isDefault && <Badge tone="accent">Predeterminada</Badge>}
                    {!version.isActive && <Badge>Archivada</Badge>}
                  </dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <dt className="ui-label w-32 shrink-0">Lanzamiento</dt>
                  <dd>{version.releaseLabel ?? '—'}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <dt className="ui-label w-32 shrink-0">Estructura</dt>
                  <dd>
                    {version.nodeCount > 0
                      ? `${version.nodeCount} ${version.nodeCount === 1 ? 'nivel' : 'niveles'} de ajustes`
                      : 'Sin niveles creados'}
                  </dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <dt className="ui-label w-32 shrink-0">Creada</dt>
                  <dd>{formatDateTime(version.createdAt)}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <dt className="ui-label w-32 shrink-0">Última edición</dt>
                  <dd>{formatDateTime(version.updatedAt)}</dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Notas" description="Contexto de esta versión.">
              <p className="text-[13px] leading-relaxed text-ink-muted text-pretty">
                {version.notes ?? 'Sin notas.'}
              </p>
            </Panel>
          </div>

          <Panel
            className="mt-5"
            title="Secciones de la versión"
            description="Todo lo que sigue trabaja sobre esta versión."
            flush
          >
            <ul className="divide-y divide-line">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <li key={section.key}>
                    <Link
                      to={`/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}/${section.key}`}
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
                        <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">
                          {section.description}
                        </span>
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
        </>
      )}
    </VersionSection>
  )
}
