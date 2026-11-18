import { PendingStage } from '../../../components/feedback/PendingStage'
import { VersionSection } from '../../versions/components/VersionSection'

export const ExperimentsPage = () => (
  <VersionSection
    title="Experimentos"
    description="Cada prueba documenta qué se quería comprobar, qué se cambió y cuál fue el resultado observado."
  >
    <PendingStage
      stage={10}
      title="Laboratorio de experimentos"
      description="Los cambios se registran como historial con valor anterior y valor nuevo; editar un experimento antiguo no altera el perfil actual."
      items={[
        'Crear experimentos con objetivo e hipótesis',
        'Registrar varios cambios por experimento',
        'Estados: planificado, en curso, completado, fallido, no concluyente',
        'Comparar experimentos y conclusiones',
      ]}
    />
  </VersionSection>
)
