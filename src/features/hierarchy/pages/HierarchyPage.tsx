import { PendingStage } from '../../../components/feedback/PendingStage'
import { VersionSection } from '../../versions/components/VersionSection'

export const HierarchyPage = () => (
  <VersionSection
    title="Estructura de parámetros"
    description="Árbol de categorías y grupos con profundidad ilimitada, y los parámetros definidos en cada nivel."
  >
    <PendingStage
      stage={7}
      title="Constructor de jerarquía"
      description="Aquí vivirán el árbol navegable, el arrastre para mover ramas completas y el panel de detalle del nodo seleccionado."
      items={[
        'Crear nodos raíz e hijos en cualquier nivel',
        'Mover ramas con drag & drop y reordenar hermanos',
        'Prevenir ciclos y movimientos entre versiones',
        'Buscar nodos, breadcrumbs y detalle del nodo',
      ]}
    />
  </VersionSection>
)
