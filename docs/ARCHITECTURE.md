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

## Capa de datos (Etapa 4)

- **Entorno**: `src/lib/config/env.ts` lee `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_PUBLISHABLE_KEY` (o `VITE_SUPABASE_ANON_KEY` como respaldo). Si
  faltan, el cliente lanza `AppError('config')` y la UI lo explica; el bundle no se
  rompe al arrancar.
- **Cliente**: `src/lib/supabase/client.ts` es el único `createClient`. La sesión la
  gestiona la librería; la app no copia tokens.
- **API propia**: `src/lib/axios/client.ts` centraliza `baseURL`, timeout y
  normalización de errores para la Etapa 11.
- **Servicios**: cada dominio expone un objeto con funciones y documenta su
  contrato en el propio archivo (entradas, salida y errores). Toda consulta lleva
  paginación o un tope explícito; las lecturas completas (árbol) van por lotes y
  avisan con `truncated` si alcanzan el límite.
- **Errores**: un solo traductor (`toAppError`) convierte `23505`, `23503`, `23514`,
  `42501`, `PGRST116`, `PGRST205`, errores de Auth y fallos de red en mensajes en
  español.
- **Estados**: `useAsyncData` implementa `idle | loading | success | error` con
  `reload` para el reintento. Las vistas deciden qué mostrar en vacío.

## Estructura de carpetas

| Carpeta | Responsabilidad | Estado |
|---|---|---|
| `src/app/` | `AppShell`, providers y router | ✅ |
| `src/app/router/` | rutas y guarda de sesión (`RequireSession`) | ✅ |
| `src/features/auth/` | `AuthProvider`, `useAuth`, `/login` y validación de acceso | ✅ Etapa 4 |
| `src/components/common/` | `Button`, `ButtonLink`, `IconButton`, `Badge`, `Panel`, `Dialog`, `ConfirmDialog` | ✅ |
| `src/components/layout/` | shell, sidebar, topbar móvil, breadcrumbs, cabecera, pestañas | ✅ |
| `src/components/feedback/` | `Spinner`, `EmptyState`, `ErrorState`, `PendingStage`, toasts | ✅ |
| `src/components/forms/` | `FormField`, `Input`, `Textarea`, `Select`, estilos de control | ✅ |
| `src/components/tree/` | primitivas del árbol (fila, guía, indentación) | integrado en `features/hierarchy` |
| `src/features/hierarchy/` | constructor del árbol: `treeUtils`, `NodeRow`, detalle, formulario y drag & drop | ✅ Etapa 7 |
| `src/features/parameters/` | parámetros: formulario tipado, lista por nodo, ficha y formato de valores | ✅ Etapa 8 |
| `src/features/cameras/` | catálogo real: página, `CameraFormDialog` y validación del dominio | ✅ Etapa 5 |
| `src/features/versions/` | versiones reales: formulario, duplicación de estructura, ficha (resumen) | ✅ Etapa 6 |
| `src/features/<modulo>/` | `pages/`, `components/`, hooks y validación del dominio | ✅ parcial |
| `src/hooks/` | `usePageTitle`, `useAsyncData`, `useWorkspaceSelection`, `useDebouncedValue` | ✅ |
| `src/lib/helpers/` | funciones puras (`cn`, `shortId`, `slugify`, `formatDate`) | ✅ |
| `src/lib/supabase/` | cliente único de Supabase | ✅ Etapa 4 |
| `src/lib/axios/` | instancia HTTP e interceptores | ✅ base (la usa la Etapa 11) |
| `src/lib/errors/` | `AppError` y `toAppError` | ✅ Etapa 4 |
| `src/lib/config/` | lectura de variables `VITE_*` | ✅ Etapa 4 |
| `src/lib/constants/` | `app`, `navigation`, `versionSections` (uniones, no enums) | ✅ |
| `src/lib/validation/` | validadores compartidos | Etapa 5 |
| `src/services/` | `types` + un archivo por agregado (`cameraService`, `versionService`, `nodeService`, `parameterService`, `configurationService`, `experimentService`, `historyService`, `authService`) | ✅ Etapa 4 |
| `src/stores/` | Zustand: `useWorkspaceStore` (selección) y `useUiStore` (menú móvil) | ✅ Etapa 4 |
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
  construye en memoria un índice `Map<id, Node[]>` indexado por `parent_id`
  (`features/hierarchy/treeUtils.ts`).
- Render recursivo por nivel; sin límite de profundidad ni componentes anidados
  predefinidos. Expansión contraída por nodo; la rama del nodo seleccionado se
  muestra siempre expandida (recordar selección con `useWorkspaceStore`).
- Drag & drop con `@dnd-kit`: tres zonas por fila (antes/dentro/después), detección
  `pointerWithin` priorizando las franjas; el nuevo `parent_id` y `sort_order` se
  calculan en cliente, se validan (sin ciclos, misma versión) y se persisten con
  `nodeService.move`/`reorder` (D-028).
- Las rutas se derivan del índice; no se guardan.
- Búsqueda por nombre: muestra coincidencias y sus ancestros, con la rama expandida.

## Estados de UI obligatorios

Toda consulta expone: `idle | loading | success | empty | error`. El error incluye
mensaje legible y acción de reintento.

## Decisiones abiertas

- **Etapa 11**: la API externa necesita ejecución fuera del navegador. Opciones:
  Vercel Functions (`api/`) o Edge Functions de Supabase. Se decidirá al llegar.
- **Etapa 12**: MCP probablemente requiera `@modelcontextprotocol/sdk`; pendiente de
  autorización.
- **Etapa 14**: no hay runner de tests; pendiente de autorización.
