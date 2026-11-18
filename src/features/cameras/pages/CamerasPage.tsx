import { Camera } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { useToast } from '../../../components/feedback/ToastContext'
import { PageHeader } from '../../../components/layout/PageHeader'

export const CamerasPage = () => {
  const { notify } = useToast()

  const announcePending = () =>
    notify({
      title: 'Alta de cámaras en la Etapa 05',
      description: 'La conexión con Supabase llega en la Etapa 04 y el formulario en la 05.',
    })

  return (
    <>
      <PageHeader
        title="Mis cámaras"
        description="LMC, AGC, BSG o cualquier otra modificación de GCam. Son registros de datos: la aplicación no fija nombres ni versiones."
        breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Mis cámaras' }]}
      />

      <EmptyState
        icon={Camera}
        title="Todavía no hay cámaras registradas"
        description="Cada cámara agrupa sus propias versiones, y cada versión mantiene un árbol de parámetros independiente."
        action={
          <Button variant="primary" onClick={announcePending}>
            Crear la primera cámara
          </Button>
        }
        footnote="Buscar, filtrar y archivar llegarán junto con el catálogo real."
      />
    </>
  )
}
