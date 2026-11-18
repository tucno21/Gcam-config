import { Camera, ImageOff, ShieldCheck, Wrench } from 'lucide-react'
import { ButtonLink } from '../components/common/ButtonLink'
import { Panel } from '../components/common/Panel'
import { PageHeader } from '../components/layout/PageHeader'

const WORKFLOW = [
  {
    title: 'Registra el catálogo',
    description:
      'Cada familia de GCam —LMC, AGC, BSG o cualquier otra— con sus versiones. Cada versión conserva su propia estructura de parámetros.',
  },
  {
    title: 'Documenta la estructura',
    description:
      'Categorías dentro de categorías, sin límite de profundidad, con el valor predeterminado de cada parámetro y la procedencia de ese valor.',
  },
  {
    title: 'Prueba y registra',
    description:
      'Aplica los cambios a mano en el teléfono y anota aquí qué cambiaste, desde qué valor, a qué valor y qué observaste.',
  },
]

const SCOPE = [
  {
    icon: Wrench,
    title: 'No modifica GCam',
    description: 'Documenta cambios que aplicas manualmente en el teléfono.',
  },
  {
    icon: ImageOff,
    title: 'Sin fotos ni videos',
    description: 'Los resultados se guardan como texto y datos estructurados.',
  },
  {
    icon: ShieldCheck,
    title: 'Privado por diseño',
    description: 'Acceso autenticado y RLS al conectar Supabase (Etapa 03).',
  },
]

export const HomePage = () => (
  <>
    <PageHeader
      title="Inicio"
      description="Catálogo y laboratorio de configuraciones GCam. Documenta parámetros, conserva perfiles y registra cada experimento con su historial."
      actions={
        <ButtonLink to="/cameras" variant="primary" leadingIcon={<Camera aria-hidden="true" className="size-4" />}>
          Ir a Mis cámaras
        </ButtonLink>
      }
    />

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Panel title="Cómo funciona" description="Tres pasos, siempre en el mismo orden.">
        <ol className="divide-y divide-line">
          {WORKFLOW.map((step, index) => (
            <li key={step.title} className="flex gap-3.5 py-4 first:pt-0 last:pb-0">
              <span aria-hidden="true" className="mt-0.5 font-mono text-[11px] text-accent">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{step.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted text-pretty">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Alcance" description="Lo que hay y lo que no hay.">
        <ul className="space-y-4">
          {SCOPE.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex gap-3">
              <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
              <div>
                <p className="text-[13px] font-medium text-ink">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  </>
)
