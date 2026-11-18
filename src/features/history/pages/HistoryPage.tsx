import { PendingStage } from '../../../components/feedback/PendingStage'
import { VersionSection } from '../../versions/components/VersionSection'

export const HistoryPage = () => (
  <VersionSection
    title="Historial"
    description="Cronología de modificaciones con la ruta jerárquica del parámetro en el momento del cambio."
  >
    <PendingStage
      stage={10}
      title="Historial de cambios"
      description="Cada modificación conserva valor anterior, valor nuevo, motivo, observación y fecha. El registro no se sobrescribe."
      items={[
        'Cronología por versión y por perfil',
        'Ruta histórica aunque después se renombre un nodo',
        'Filtro por parámetro, experimento y fecha',
        'Parámetros modificados con mayor frecuencia',
      ]}
    />
  </VersionSection>
)
