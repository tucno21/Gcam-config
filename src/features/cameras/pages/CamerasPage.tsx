import { Camera, Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../components/common/Badge'
import { Button } from '../../../components/common/Button'
import { Panel } from '../../../components/common/Panel'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { PageHeader } from '../../../components/layout/PageHeader'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { cameraService } from '../../../services/cameraService'

/** Primera vista conectada a Supabase: lista real con los cuatro estados de UI. */
export const CamerasPage = () => {
  const { notify } = useToast()
  const { status, data, error, reload } = useAsyncData(
    () => cameraService.list({ limit: 50 }),
    'cameras:active',
  )

  const cameras = data?.items ?? []
  const announcePending = () =>
    notify({
      title: 'Alta de cámaras en la Etapa 05',
      description: 'La conexión ya está activa; el formulario de alta llega en la siguiente etapa.',
    })

  return (
    <>
      <PageHeader
        title="Mis cámaras"
        description="LMC, AGC, BSG o cualquier otra modificación de GCam. Son registros de datos: la aplicación no fija nombres ni versiones."
        breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Mis cámaras' }]}
        actions={
          <>
            {(status === 'success' || status === 'error') && (
              <Button
                size="sm"
                leadingIcon={<RefreshCw aria-hidden="true" className="size-4" />}
                onClick={reload}
              >
                Actualizar
              </Button>
            )}
            <Button
              variant="primary"
              leadingIcon={<Plus aria-hidden="true" className="size-4" />}
              onClick={announcePending}
            >
              Nueva cámara
            </Button>
          </>
        }
      />

      {status === 'loading' && cameras.length === 0 && (
        <div className="flex items-center gap-2 px-1 py-6 text-sm text-ink-muted" role="status">
          <Spinner />
          <span>Cargando cámaras…</span>
        </div>
      )}

      {status === 'error' && error && (
        <ErrorState title="No se pudieron cargar las cámaras" description={error.message} onRetry={reload} />
      )}

      {status === 'success' && cameras.length === 0 && (
        <EmptyState
          icon={Camera}
          title="Todavía no hay cámaras registradas"
          description="Cada cámara agrupa sus propias versiones, y cada versión mantiene un árbol de parámetros independiente."
          action={
            <Button variant="primary" onClick={announcePending}>
              Crear la primera cámara
            </Button>
          }
          footnote="Buscar, filtrar y archivar llegarán junto con el formulario de alta."
        />
      )}

      {cameras.length > 0 && (
        <Panel
          title={`${data?.total ?? cameras.length} ${data?.total === 1 ? 'cámara' : 'cámaras'}`}
          description="Ordenadas por nombre. Los datos se leen en vivo de Supabase."
          action={
            status === 'loading' ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint" role="status">
                <Spinner className="size-3" />
                Actualizando
              </span>
            ) : undefined
          }
          flush
        >
          <ul className="divide-y divide-line">
            {cameras.map((camera) => (
              <li key={camera.id}>
                <Link
                  to={`/cameras/${camera.id}`}
                  className="flex flex-col gap-1 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.03]"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{camera.name}</span>
                    <code className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-faint">
                      {camera.slug}
                    </code>
                    {!camera.isActive && <Badge>Archivada</Badge>}
                  </span>
                  {camera.description && (
                    <span className="text-[13px] leading-relaxed text-ink-muted">{camera.description}</span>
                  )}
                  {camera.developer && (
                    <span className="text-[11px] text-ink-disabled">Desarrollador: {camera.developer}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  )
}
