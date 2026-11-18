import { Plus } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '../../../components/common/Button'
import { PendingStage } from '../../../components/feedback/PendingStage'
import { useToast } from '../../../components/feedback/ToastContext'
import { PageHeader } from '../../../components/layout/PageHeader'
import { useWorkspaceSelection } from '../../../hooks/useWorkspaceSelection'
import { shortId } from '../../../lib/helpers/shortId'

export const CameraPage = () => {
  const { cameraId } = useParams()
  const { notify } = useToast()
  useWorkspaceSelection(cameraId)

  return (
    <>
      <PageHeader
        title={`Cámara · ${shortId(cameraId)}`}
        description="Ficha de la cámara y listado de sus versiones. Los nombres y la descripción se cargarán desde la base de datos."
        breadcrumbs={[{ label: 'Mis cámaras', to: '/cameras' }, { label: 'Cámara' }]}
        actions={
          <Button
            variant="primary"
            leadingIcon={<Plus aria-hidden="true" className="size-4" />}
            onClick={() =>
              notify({
                title: 'Alta de versiones en la Etapa 06',
                description: 'Antes hay que conectar la base de datos (Etapa 04).',
              })
            }
          >
            Nueva versión
          </Button>
        }
      />

      <PendingStage
        stage={6}
        title="Versiones de esta cámara"
        description="Una cámara puede tener varias versiones y cada una mantiene su estructura, sus perfiles y sus experimentos por separado."
        items={[
          'Crear, editar y archivar versiones',
          'Marcar una versión como predeterminada',
          'Evitar versiones duplicadas en la misma cámara',
          'Duplicar estructura entre versiones con confirmación',
        ]}
      />
    </>
  )
}
