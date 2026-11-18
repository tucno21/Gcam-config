# AGENTS.md — Laboratorio de Configuraciones GCam

Guía permanente para OpenCode y cualquier agente que trabaje en este repositorio.
Léela completa antes de modificar código. El alcance funcional de referencia es
`tarea_gcam.md`.

## 1. Objetivo y alcance

Aplicación web **privada**, responsive y de bajo costo para catalogar cámaras GCam
(LMC, AGC, BSG y las que el usuario registre), sus versiones, su árbol jerárquico de
parámetros, sus perfiles de configuración y sus experimentos.

La aplicación es un **catálogo y laboratorio de documentación**: no modifica la app
GCam instalada en el teléfono. Los cambios los aplica el usuario a mano y aquí solo
se documentan.

**Fuera de alcance, de forma permanente:**

- Almacenar fotografías, videos o cualquier archivo multimedia. No crear tablas,
  buckets, campos ni componentes para ello.
- Afirmar que la app aplica cambios en el dispositivo.
- Inventar parámetros, rutas, rangos ni valores predeterminados reales de LMC, AGC
  o BSG.

## 2. Stack y dependencias

Instalado y fijado en `package.json`:

| Pieza | Versión | Nota |
|---|---|---|
| React / react-dom | 19.3.1 | |
| Vite | 6.2.7 | plugin `@vitejs/plugin-react` |
| Tailwind CSS | 4.3.5 | vía `@tailwindcss/vite`; **v4, sin `tailwind.config.js`** |
| TypeScript | 7.0.2 | `tsc -b`, sin emit |
| oxlint | 1.94.0 | linter del proyecto (**no** ESLint) |
| react-router-dom | 7.18.5 | rutas y navegación |
| lucide-react | 1.75.0 | iconos |
| zustand | 5.1.0 | estado de interfaz compartido |
| axios | 1.21.1 | API propia (instancia en `lib/axios/`) |
| @supabase/supabase-js | 2.109.0 | datos y Auth (cliente en `lib/supabase/`) |

Pendientes de instalar, cada una en la etapa que la use: `@dnd-kit/core`,
`@dnd-kit/sortable`, `@dnd-kit/utilities` (Etapa 7).

**Dependencias autorizadas para agregar cuando la etapa lo requiera** (nada más):

`zustand`, `lucide-react`, `axios`, `@dnd-kit/core`, `@dnd-kit/sortable`,
`@dnd-kit/utilities`, `@supabase/supabase-js`, `react-router-dom`.

Reglas:

1. Antes de instalar, revisar `package.json` y reutilizar lo ya presente.
2. **No agregar ninguna otra dependencia** (formularios, validación, tablas,
   modales, UI kits, gráficos, fechas, utilidades, test runners) sin autorización
   expresa del usuario, dejando la razón documentada en `docs/DECISIONS.md`.
3. No actualizar versiones de dependencias sin una razón técnica documentada.
4. No reemplazar Axios por `fetch` ni introducir una segunda solución de estado.
5. No agregar Prettier, ESLint ni un segundo linter: el proyecto usa **oxlint**.

## 3. Restricciones del compilador

`tsconfig.app.json` es estricto y condiciona el estilo del código:

- `erasableSyntaxOnly: true` → **prohibido `enum`** y parameter properties.
  Usar `as const` + uniones de literales.
- `verbatimModuleSyntax: true` → usar `import type { X } from '...'` para tipos.
- `noUnusedLocals` / `noUnusedParameters: true` → sin variables muertas.
- `allowImportingTsExtensions: true` está habilitado, pero la convención del
  proyecto es importar **sin extensión** (`./App`). No mezclar estilos.

## 4. Arquitectura y estructura de carpetas

```text
src/
  app/            # arranque, router y providers
    router/
    providers/
  components/     # reutilizables, sin lógica de negocio
    common/ layout/ feedback/ forms/ tree/
  features/       # un módulo por dominio
    auth/ cameras/ versions/ hierarchy/ parameters/
    configurations/ experiments/ history/ assistant/
  hooks/          # hooks compartidos
  lib/            # supabase/ axios/ errors/ config/ constants/ helpers/ validation/
  services/       # acceso a datos por dominio + types.ts del contrato
  stores/         # Zustand (solo estado de interfaz compartido)
  styles/         # tokens y estilos globales
  pages/          # páginas asociadas a rutas

supabase/         # base de datos versionada (no se importa desde src/)
  migrations/     # esquema, funciones/triggers y RLS, en orden
  seed.sql        # datos de demostración ficticios y opcionales
  tests/          # pruebas de aislamiento para la base local
```

La base de datos es parte del repositorio: cualquier cambio de esquema, trigger o
política entra por `supabase/migrations/` y actualiza `docs/DATABASE.md` en el mismo
cambio. Cómo aplicarlo: `docs/SETUP-SUPABASE.md`.

Reglas de capas (dirección permitida: `pages/features → hooks/stores → services → lib`):

- `features/**` y `pages/**` **nunca** importan `@supabase/supabase-js` ni
  construyen consultas. Solo llaman a `services/`.
- `lib/supabase/` es el **único** lugar que crea el cliente Supabase.
- `lib/axios/` es el **único** lugar que crea la instancia Axios.
- `components/**` no conoce Supabase, ni el router, ni los servicios de dominio.
- Evitar imports circulares y archivos "barril" (`index.ts`) que los favorezcan.

## 5. Convenciones de nombres

- Componentes: `PascalCase.tsx`, un componente por archivo, archivo = componente.
- Hooks: `useAlgo.ts`, en `src/hooks/` si es compartido o en
  `features/<modulo>/hooks/` si es del dominio.
- Stores: `useAlgoStore.ts` en `src/stores/`, exporta un hook de Zustand.
- Servicios: `algoService.ts` en `src/services/`, exporta un objeto con funciones
  (`cameraService.list()`), no una clase.
- Tipos: `PascalCase` sin prefijo `I`. Filas de BD: `CameraRow`; dominio: `Camera`.
- Constantes: `SCREAMING_SNAKE_CASE` en `src/lib/constants/`.
- SQL: `snake_case`, tablas en plural.
- CSS: utilidades Tailwind; las variantes de un componente se resuelven con mapas
  de clases pequeños, no con condicionales anidados.
- Idioma: documentación, comentarios y textos de UI en **español**; identificadores
  de código en **inglés**.

## 6. Componentes

- Pequeños y con una responsabilidad. Si un archivo supera ~200 líneas o mezcla
  fetch + validación + presentación, dividirlo.
- Nada de lógica de negocio en `components/common`.
- Toda vista debe cubrir los cuatro estados: **cargando, vacío, error con
  reintento, contenido**.
- Accesibilidad mínima obligatoria: `<label>` asociado, foco visible, navegación
  por teclado, `aria-invalid`/`aria-describedby` en errores, nombres accesibles en
  botones con solo icono.

## 7. Formularios y validación

- Formularios propios con React (estado controlado; `useReducer` si el formulario
  es grande). Sin librerías.
- Validadores **funciones puras** en `src/lib/validation/` o en
  `features/<modulo>/validation.ts`. Devuelven un mapa `campo → mensaje`.
- Validar al salir del campo (blur) y al enviar; mostrar el mensaje **junto al
  campo**, no en un alert global.
- La validación del navegador es UX, **no** seguridad: la base de datos y la API
  validan de nuevo.

## 8. Acceso a datos

- Toda operación de persistencia vive en `src/services/`, un archivo por dominio:
  `cameraService`, `versionService`, `nodeService`, `parameterService`,
  `configurationService`, `experimentService`, `historyService` y `authService`.
  Los tipos de fila y de dominio están en `services/types.ts`.
- Cada servicio documenta su contrato: firma, entradas, salida y errores posibles.
  Devuelve dominio en `camelCase`; `*Row` (snake_case) no sale de `services/`.
- Los errores se normalizan con `toAppError()` a `AppError` (`code` + `message`
  legible) en el propio servicio; las vistas solo muestran el mensaje y ofrecen
  reintentar.
- Toda consulta lleva límite/paginación. Prohibido `select('*')` masivo sin filtro
  ni límite en tablas grandes. Las lecturas completas (árbol) van por lotes con tope
  y exponen `truncated`.
- Zustand solo guarda estado de interfaz (cámara/versión/perfil seleccionados,
  filtros, preferencias de navegación). **La base de datos es la fuente de verdad**;
  no se duplican registros persistidos en el store.

## 9. Seguridad y entorno

- Variables de entorno con prefijo `VITE_` (expuestas al navegador). Nombre y valor
  ficticio en `.env.example`; valores reales solo en `.env.local` (ignorado por git).
  Nombres: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (o
  `VITE_SUPABASE_ANON_KEY` como respaldo) y `VITE_API_BASE_URL` (Etapa 11).
- **Prohibido** `service_role` o cualquier clave privilegiada en el frontend.
- Prohibido guardar secretos, tokens o claves en Zustand, `localStorage` propio o en
  el repositorio. La **sesión** la persiste `supabase-js` (D-024); la app no la copia.
- Todo acceso a datos exige sesión: `/login` + `RequireSession`. La guarda es UX; la
  seguridad real es RLS.
- RLS **activado** en toda tabla expuesta al cliente, con políticas basadas en
  `auth.uid()`. Un usuario autenticado solo accede a sus filas, salvo catálogos
  explícitamente públicos.
- `anon` no tiene privilegios de tabla: sin sesión no se lee ni se escribe.
- Las reglas de integridad se validan también en la base (triggers), no solo en los
  servicios: la base es la última línea de defensa.
- Toda tabla nueva se crea en una migración con `enable row level security`,
  políticas por operación, `revoke` para `anon` y `grant` explícitos para
  `authenticated`.
- Ocultar un botón no es seguridad: la protección vive en RLS y en la API.
- La API externa (Etapa 11) valida autenticación, autorización, IDs, tipos y
  límites de resultados en cada petición.
- No crear buckets de almacenamiento de imágenes.

## 10. Árbol jerárquico (funcionalidad central)

- Profundidad **ilimitada**: render recursivo, nunca anidamiento fijo de componentes.
- Modelo: `parameter_nodes.parent_id` (nullable) + `sort_order`. El nodo raíz tiene
  `parent_id = NULL`.
- Un árbol pertenece a **una** `camera_version_id`; prohibido mover nodos entre
  versiones.
- Invariantes que se validan antes de escribir:
  1. Un nodo no puede ser padre de sí mismo.
  2. Un nodo no puede moverse dentro de su propio subárbol (sin ciclos).
  3. Los descendientes se conservan al mover una rama.
  4. `sort_order` queda estable y contiguo entre hermanos.
- La ruta completa (breadcrumbs) se **calcula** desde las relaciones; nunca se
  guarda como fuente de verdad duplicada.
- Operaciones destructivas: confirmación explícita indicando cuántos parámetros y
  descendientes se verán afectados.

## 11. Valor predeterminado e historial

- `parameters.default_value` es documentación de referencia y **nunca** se
  sobrescribe al editar un perfil.
- El valor actual vive en `configuration_values` (uno por configuración + parámetro).
- Si el valor predeterminado no se conoce, se registra como desconocido con su
  `default_value_source`; no se rellena con un valor inventado.
- `parameter_changes` es **append-only**: conserva valor anterior, valor nuevo,
  motivo, observación, fecha y una instantánea de la ruta jerárquica del momento.
- Editar un experimento antiguo no altera en silencio la configuración actual.

## 12. Datos reales vs. ficticios

- No inventar nombres de parámetros, rangos, unidades ni valores por defecto de
  LMC, AGC o BSG.
- Cualquier dato de demostración debe estar marcado como **ficticio** en la UI y en
  el seed.
- No asumir que dos cámaras o versiones comparten estructura de parámetros.

## 13. Flujo de trabajo por etapas

1. Anunciar qué se va a modificar y qué archivos se tocan.
2. Implementar **una** etapa a la vez; no avanzar con errores de compilación,
   consola o fallos funcionales abiertos.
3. Inspeccionar antes de borrar: si algo parece trabajo previo del usuario, no se
   elimina sin justificarlo.
4. Verificar (ver §14) y reportar: archivos creados/modificados, decisiones,
   pruebas ejecutadas, resultados y pendientes.
5. Detenerse y esperar autorización antes de la etapa siguiente.
6. Actualizar `AGENTS.md` y `docs/` cuando cambien convenciones, arquitectura o
   decisiones importantes.

## 14. Verificaciones obligatorias

| Comando | Cuándo |
|---|---|
| `npm run build` | al cerrar **toda** etapa (incluye `tsc -b`) |
| `npm run lint` | al cerrar toda etapa |
| `npm run dev` + revisión manual | etapas con UI |
| `psql … -f supabase/tests/rls.sql` | etapas que toquen esquema, RLS o políticas |

No existe script de tests todavía; si una etapa requiere pruebas automatizadas, se
pide autorización para agregar el runner. **No afirmar que una prueba pasó si no se
ejecutó.**

## 15. Memoria de trabajo (Engram MCP)

- Engram es memoria del **proceso de desarrollo**, no la app. No confundir con el
  MCP de consulta del catálogo GCam (Etapa 12).
- Registrar al cerrar cada etapa: decisiones, estado, pendientes y trampas
  encontradas. Nunca secretos, claves ni datos sensibles.
- La fuente de verdad compartida es este archivo + `docs/`; Engram es apoyo de
  continuidad.
- Si Engram no está disponible, continuar y dejar constancia local; no bloquear el
  desarrollo.

## 16. Definición de "etapa terminada"

Una etapa está terminada cuando:

1. Se cumplió su criterio de aceptación.
2. `npm run build` y `npm run lint` pasan sin errores.
3. No hay errores nuevos en consola del navegador.
4. La documentación afectada está actualizada.
5. Se reportó el resumen (archivos, decisiones, pruebas, pendientes).
6. Se registró el estado en Engram.

## 17. Estado actual

- **Etapa 0** — auditoría inicial: completada.
- **Etapa 1** — documentación base: completada.
- **Etapa 2** — arquitectura y estructura del frontend: completada (shell, rutas,
  sistema visual y componentes base). Las vistas de datos siguen siendo marcadores
  que indican su etapa.
- **Etapa 3** — modelo de datos y RLS: completada (`supabase/migrations/`,
  `seed.sql`, `tests/rls.sql`, `docs/SETUP-SUPABASE.md`). Verificada sobre
  PostgreSQL 18 con un shim de `auth`/roles: 9 tablas, 34 políticas, 13 triggers y
  toda la suite de aislamiento en verde.
- **Etapa 4** — conexión y capa de datos: implementada. Cliente Supabase único,
  instancia Axios, `AppError` con `toAppError`, ocho servicios documentados,
  `useAsyncData`, stores de interfaz, `/login` con Supabase Auth y guarda
  `RequireSession`; `Mis cámaras` lista datos reales. `npm run build` y
  `npm run lint` en verde.
- **Etapa 5** — catálogo de cámaras: completada. CRUD completo con persistencia
  real: alta y edición con formulario propio y validación pura, slug autogenerado,
  búsqueda con debounce, filtro por estado, conteo de versiones por cámara,
  archivar/reactivar, borrado solo cuando no hay versiones (D-026) y ficha de
  detalle. Verificado con E2E real en Chrome headless (crear, validar vacío,
  editar, archivar, reactivar, detalle, eliminar y búsqueda sin resultados) sin
  errores de consola; la base quedó sin datos de prueba.
- **Proyecto alojado** (`yyfgsvcngakunqwgaktb`, región `aws-1-us-east-1`): esquema
  aplicado con **4 migraciones** registradas en `supabase_migrations.schema_migrations`,
  incluida la de endurecimiento de privilegios (D-025). Verificado con el usuario
  real: `anon` → `42501`, CRUD de extremo a extremo en verde (19 comprobaciones) y
  todos los bloqueos del modelo activos. El acceso administrativo va por el pooler
  `aws-1-us-east-1.pooler.supabase.com` porque el host directo solo tiene IPv6.
- **Pendiente operativo**: configurar la URL del sitio en el panel
  (*Authentication → URL Configuration → Site URL*, p. ej. `http://localhost:5173`)
  para que los enlaces de correo no caigan en `localhost:3000`. Recomendado resetear
  la contraseña de la base tras terminarla de usar fuera del panel.
