import { PendingStage } from '../../../components/feedback/PendingStage'
import { VersionSection } from '../../versions/components/VersionSection'

export const AssistantPage = () => (
  <VersionSection
    title="Asistente"
    description="Consultas sobre el catálogo real y propuestas de experimentos que se revisan antes de aceptar."
  >
    <PendingStage
      stage={12}
      title="Asistente conectado a los datos"
      description="El asistente consulta primero los parámetros registrados y nunca aplica cambios por su cuenta: solo propone y tú decides."
      items={[
        'Localizar parámetros por nombre, clave o ruta',
        'Consultar valores predeterminados y actuales',
        'Proponer experimentos pequeños y explicables',
        'Aceptar, rechazar o editar cada recomendación',
      ]}
    />
  </VersionSection>
)
