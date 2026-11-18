import { PendingStage } from '../../../components/feedback/PendingStage'
import { VersionSection } from '../../versions/components/VersionSection'

export const ConfigurationsPage = () => (
  <VersionSection
    title="Configuraciones"
    description="Perfiles independientes por versión, con el valor actual de cada parámetro frente a su valor predeterminado."
  >
    <PendingStage
      stage={9}
      title="Perfiles de configuración"
      description="Un perfil guarda valores concretos sin tocar el valor predeterminado del catálogo, que se conserva como referencia."
      items={[
        'Crear, duplicar y archivar perfiles',
        'Comparar valor actual con valor predeterminado',
        'Buscar y filtrar por categoría, tipo o estado',
        'Restaurar el valor predeterminado de un parámetro',
      ]}
    />
  </VersionSection>
)
