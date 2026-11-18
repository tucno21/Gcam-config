# Arquitectura

Aplicación SPA (Vite + React 19 + TypeScript) que habla con Supabase (Postgres + Auth
+ RLS). No hay servidor propio en la primera versión; la API externa para
herramientas (Etapa 11) se añadirá como capa aparte.

## Capas

```text
pages/ + features/     presentación y lógica de dominio
        │
        ├── hooks/     estado y efectos reutilizables
        ├── stores/    Zustand: solo estado de interfaz compartido
        ▼
     services/         contrato de datos por dominio
        │
        ▼
  lib/supabase/        ÚNICO lugar que crea el cliente Supabase
  lib/axios/           ÚNICA instancia Axios (para la API propia, Etapa 11)
        │
        ▼
   Supabase / API       fuente de verdad
```

Reglas:

- Una vista **nunca** importa `@supabase/supabase-js` ni escribe consultas.
- Los servicios devuelven datos de dominio ya normalizados; los errores se convierten
  a `AppError` en un único punto.
- `components/` es agnóstico: no conoce servicios, router ni Supabase.
- El estado persistente **no se copia** a Zustand; se consulta de nuevo.

## Flujo de una operación típica

```text
Usuario → form (validación local) → hook de feature → service → Supabase
                                     ▲                    │
                                     └── AppError ◄────────┘
        UI: loading → error+retry | vacío | contenido
```

## Estructura de carpetas

| Carpeta | Responsabilidad | Estado |
|---|---|---|
| `src/app/` | `AppShell`, providers y router | ✅ |
| `src/app/router/` | rutas y guardas de sesión | ✅ (guardas en Etapa 4) |
| `src/components/common/` | `Button`, `ButtonLink`, `IconButton`, `Badge`, `Panel`, `Dialog` | ✅ |
| `src/components/layout/` | shell, sidebar, topbar móvil, breadcrumbs, cabecera, pestañas | ✅ |
| `src/components/feedback/` | `Spinner`, `EmptyState`, `ErrorState`, `PendingStage`, toasts | ✅ |
| `src/components/forms/` | `FormField`, `Input`, `Textarea`, `Select`, estilos de control | ✅ (sin formularios aún) |
| `src/components/tree/` | primitivas del árbol (fila, guía, indentación) | Etapa 7 |
| `src/features/<modulo>/` | `pages/`, `components/`, hooks y validación del dominio | ✅ parcial |
| `src/hooks/` | hooks compartidos (`usePageTitle`) | ✅ |
| `src/lib/supabase/` | cliente y utilidades de sesión | Etapa 4 |
| `src/lib/axios/` | instancia HTTP e interceptores | Etapa 11 |
| `src/lib/constants/` | `app`, `navigation`, `versionSections` (uniones, no enums) | ✅ |
| `src/lib/helpers/` | funciones puras (`cn`, `shortId`) | ✅ |
| `src/lib/validation/` | validadores compartidos | Etapa 5 |
| `src/services/` | un archivo por agregado (`cameraService.ts`, …) | Etapa 4 |
| `src/stores/` | Zustand: selección actual, filtros, preferencias | Etapa 5 |
| `src/styles/` | `theme.css` (tokens `@theme`) y `base.css` | ✅ |
| `src/pages/` | inicio, 404 y error de ruta | ✅ |

### Sistema visual

Dirección: mesa de laboratorio óptico. Negro neutro, un solo tono de superficie que
solo cambia de luminosidad, hairlines de baja opacidad y un único acento cálido
(tungsteno) reservado para acción y estado activo.

- **Tokens** en `src/styles/theme.css`. Ninguna vista usa hex sueltos.
- **Profundidad**: solo bordes (`border-line` / `border-line-strong`), sin sombras.
- **Tipografía**: sans del sistema para texto; mono para claves, identificadores,
  etiquetas técnicas y números. Escala 11 / 13 / 14 / 16 / 18 / 26–28.
- **Densidad**: base de 4 px; panel `p-5`, filas de lista `py-4`, secciones `gap-5`.
- **Movimiento**: 150 ms en color/borde y `active:scale-[0.98]`; diálogos 200 ms;
  todo respeta `prefers-reduced-motion`.
- **Estados**: `Spinner`, `EmptyState`, `ErrorState` y toasts cubren carga, vacío,
  error y confirmación. Los estados vacíos van alineados a la izquierda.
- **Tema**: oscuro único (`color-scheme: dark`), decidido en D-015.

### Marcadores de etapa

Las secciones cuya etapa aún no llegó usan `PendingStage`: explican qué habrá ahí y
en qué etapa. Se sustituyen por la vista real en su etapa, sin dejar código muerto.
Las acciones todavía no implementadas avisan con un toast en lugar de fallar en
silencio.

## Rutas previstas

```text
/                          → Inicio / redirección a cámaras
/cameras                   → Mis cámaras GCam
/cameras/:cameraId         → Cámara y sus versiones
/cameras/:cameraId/versions/:versionId/hierarchy     → Estructura de parámetros
/cameras/:cameraId/versions/:versionId/parameters/:parameterId  → Ficha
/cameras/:cameraId/versions/:versionId/configurations           → Perfiles
/cameras/:cameraId/versions/:versionId/experiments              → Experimentos
/cameras/:cameraId/versions/:versionId/history                  → Historial
/cameras/:cameraId/versions/:versionId/assistant                → Asistente IA
/login                     → Acceso privado
```

La ruta jerárquica de un parámetro **no** forma parte de la URL: se calcula desde
las relaciones y se muestra como breadcrumbs dentro de la vista.

## Estado

- **Local (useState/useReducer)**: formularios, expansión de nodos, diálogos.
- **Zustand**: cámara/versión/perfil activos, filtros compartidos entre vistas,
  preferencia de tema. Nunca tokens, sesión ni filas de la base de datos.
- **Supabase**: fuente de verdad de todo lo persistente.

## Árbol jerárquico

- Se carga una vez por versión (`id, parent_id, name, node_type, sort_order`) y se
  construye en memoria un índice `Map<id, Node[]>` indexado por `parent_id`.
- Render recursivo por nivel; sin límite de profundidad ni componentes anidados
  predefinidos.
- Drag & drop con `@dnd-kit`: se calcula el nuevo `parent_id` y `sort_order` en
  cliente, se validan invariantes (sin ciclos, misma versión) y se persiste.
- Las rutas se derivan del índice; no se guardan.

## Estados de UI obligatorios

Toda consulta expone: `idle | loading | success | empty | error`. El error incluye
mensaje legible y acción de reintento.

## Decisiones abiertas

- **Etapa 11**: la API externa necesita ejecución fuera del navegador. Opciones:
  Vercel Functions (`api/`) o Edge Functions de Supabase. Se decidirá al llegar.
- **Etapa 12**: MCP probablemente requiera `@modelcontextprotocol/sdk`; pendiente de
  autorización.
- **Etapa 14**: no hay runner de tests; pendiente de autorización.
