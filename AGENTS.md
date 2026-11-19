# AGENTS.md — Laboratorio de Configuraciones GCam

Guía permanente para OpenCode y cualquier agente que trabaje en este repositorio.
Léela completa antes de modificar código. El alcance funcional de referencia es
`tarea_gcam.md`.

## 1. Objetivo y alcance

Aplicación web **privada**, responsive y de bajo costo para catalogar cámaras GCam
(LMC, AGC, BSG y las que el usuario registre) y el **espejo de sus ajustes**: niveles
del menú, parámetros con su valor actual, notas y el historial de qué se cambió y si
mejoró. Las «versiones» de la app GCam se modelan como **cámaras distintas** y se
duplican cuando se quiere partir de la anterior; no se muestran como concepto.

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
| @modelcontextprotocol/sdk | 1.32.2 | servidor MCP local (Etapa 12) |
| zod | 4.6.7 | esquemas de entrada del MCP (requisito del SDK) |
| vitest | 4.1.12 | tests de lógica pura (Etapa 14, autorizado) |

Pendientes de instalar: ninguna.

**Dependencias autorizadas para agregar cuando la etapa lo requiera** (nada más):

`zustand`, `lucide-react`, `axios`, `@supabase/supabase-js`, `react-router-dom`,
`@modelcontextprotocol/sdk`, `zod` (requisito del SDK) y `vitest` (solo dev, tests).
`@dnd-kit/*` se retiró en la Etapa 16 al sustituir el editor de árbol por el espejo
de ajustes; no se vuelve a instalar sin una razón nueva.

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
    common/ layout/ feedback/ forms/
  features/       # un módulo por dominio
    auth/ cameras/
    settings/     # espejo de ajustes e historial
  hooks/          # hooks compartidos
  lib/            # supabase/ axios/ errors/ config/ constants/ helpers/ validation/
  services/       # acceso a datos por dominio + types.ts del contrato
  stores/         # Zustand (solo estado de interfaz compartido)
  styles/         # tokens y estilos globales
  pages/          # páginas asociadas a rutas

api/              # Vercel Functions (API externa, Etapa 11; docs/API.md)
  [...path].ts    # router único; _lib/ con http, rest, validation y db
mcp/              # servidor MCP local para OpenCode (Etapa 12; mcp/README.md)
  server.ts       # herramientas de lectura y escritura limitada sobre la API

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
  `settingsService` (duplicar nivel/parámetro), `historyService` (valor actual e
  historial) y `authService`, más `catalogTransferService` (respaldos JSON, Etapa 13).
  Los tipos de fila y de dominio están en `services/types.ts`.
- Los servicios heredados de perfiles (`configurationService`, `experimentService`)
  **no se usan en la interfaz** desde la Etapa 16: se conservan para la API/MCP y para
  respaldos antiguos. No añadir código nuevo que dependa de ellos.
- Cada servicio documenta su contrato: firma, entradas, salida y errores posibles.
  Devuelve dominio en `camelCase`; `*Row` (snake_case) no sale de `services/`.
- Los errores se normalizan con `toAppError()` a `AppError` (`code` + `message`
  legible) en el propio servicio; las vistas solo muestran el mensaje y ofrecen
  reintentar.
- Toda consulta lleva límite/paginación. Prohibido `select('*')` masivo sin filtro
  ni límite en tablas grandes. Las lecturas completas (árbol) van por lotes con tope
  y exponen `truncated`.
- Zustand solo guarda estado de interfaz (cámara/versión/nivel seleccionados,
  filtros, preferencias de navegación). **La base de datos es la fuente de verdad**;
  no se duplican registros persistidos en el store.
- Cambiar el valor de un parámetro pasa **siempre** por `historyService.applyValue`:
  actualiza `parameters.current_value` y registra el cambio. Nunca se toca
  `default_value` (D-037).

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
- La API externa (Etapa 11) vive en `api/` (Vercel Function única, `docs/API.md`).
  Valida autenticación con JWT de Supabase, autorización por RLS, UUID, tipos y
  límites (1–100) en cada petición. **No** usa `service_role` ni depende de
  `@supabase/supabase-js`: habla con Auth y PostgREST por `fetch` (D-032).
  Sin endpoints destructivos; los cambios de contrato actualizan `docs/API.md`.
- No crear buckets de almacenamiento de imágenes.

## 10. Espejo de ajustes (funcionalidad central)

- La app replica el menú del teléfono: cada **nivel** es una pantalla (`Photo
  Processing`, `Main Camera`, `Sharpness`…) y cada **parámetro** es una fila con su
  valor actual. Se navega nivel a nivel, no con un editor de árbol abstracto.
- Profundidad **ilimitada**: render recursivo por navegación, nunca anidamiento fijo
  de componentes. Cada nivel tiene dos acciones: «Añadir subnivel» y «Añadir
  parámetro».
- Modelo: `parameter_nodes.parent_id` (nullable) + `sort_order` + `lineage_id`. El
  nodo raíz tiene `parent_id = NULL`.
- Un árbol pertenece a **una** cámara. Internamente cuelga de `camera_versions`
  (una por cámara, creada automáticamente); ese detalle **no se muestra** en la
  interfaz: la cámara abre directamente sus niveles.
- `lineage_id` identifica el mismo nivel/parámetro entre cámaras duplicadas
  (sobrevive a renombrar y a duplicar la cámara).
- `is_active = false` significa **retirado en esta versión**: se conserva con su
  historial y se oculta salvo que se pidan los retirados. Borrar una rama o un
  parámetro con historial es posible, pero solo con confirmación explícita de que se
  pierde el historial (D-040); para conservarlo, se retira.
- Invariantes que se validan antes de escribir:
  1. Un nodo no puede ser padre de sí mismo.
  2. Un nodo no puede moverse dentro de su propio subárbol (sin ciclos).
  3. Los descendientes se conservan al mover una rama.
  4. `sort_order` queda estable entre hermanos.
- La ruta completa (breadcrumbs) se **calcula** desde las relaciones; nunca se
  guarda como fuente de verdad duplicada.
- Operaciones destructivas: confirmación explícita indicando cuántos niveles y
  parámetros se verán afectados.

## 11. Valor actual, predeterminado e historial

- `parameters.default_value` es la **referencia de fábrica** y no se sobrescribe
  nunca al cambiar el valor actual.
- El valor que tiene el teléfono vive en `parameters.current_value` con
  `current_value_source`:
  - `custom`: valor definido a mano;
  - `default`: el propio «Default (From Library)» de GCam (se muestra literal);
  - `unknown`: sin dato.
- Si el predeterminado no se conoce, se registra como desconocido con su
  `default_value_source`; no se rellena con un valor inventado.
- `parameters.notes` guarda el conocimiento acumulado del ajuste (qué controla y qué
  se observó). Es distinto del comentario de un cambio concreto.
- `parameter_changes` es **append-only**: conserva valor anterior y nuevo (con su
  procedencia), comentario, efecto observado (`better`/`same`/`worse`/`unknown`),
  fecha y una instantánea de la ruta. No se edita; solo se elimina si se borra el
  parámetro o el nivel completo, con confirmación explícita (D-040).
- Cambiar un valor **no** crea ni modifica perfiles: los perfiles se retiraron de la
  interfaz en la Etapa 16 (D-037).

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
| `npm test` | al cerrar toda etapa (Vitest, lógica pura) |
| `npm run dev` + revisión manual | etapas con UI |
| `psql … -f supabase/tests/rls.sql` | etapas que toquen esquema, RLS o políticas |

Los tests viven junto al código (`*.test.ts`) y cubren validadores, árbol, respaldos,
errores y helpers; no hay pruebas de DOM/componentes. **No afirmar que una prueba
pasó si no se ejecutó.**

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
- **Etapa 6** — versiones: completada. CRUD de versiones por cámara con etiqueta
  única (error legible en duplicados), versión predeterminada única, archivar sin
  pérdida de datos, borrado solo si la versión está vacía, conteos de estructura y
  perfiles por versión (embed count), ficha Resumen con datos reales y duplicación
  de estructura explícita y revisable (D-027). Verificado con E2E real en Chrome
  headless: crear, duplicado de etiqueta bloqueado, editar, duplicar estructura a
  versión existente y a nueva, predeterminar, archivar, borrado bloqueado con
  explicación y ficha; sin errores de consola y base limpia.
- **Etapa 7** — jerarquía ilimitada: completada. Constructor del árbol con profundidad
  sin límite (probado hasta 4 niveles), crear raíz/hijo desde fila y panel de detalle,
  editar nombre/tipo/descripción, eliminar rama con advertencia de nodos y parámetros,
  mover y reordenar con drag & drop (tres zonas, D-028), expandir/contraer, búsqueda
  con ancestros, ruta calculada y panel de detalle; el nodo seleccionado se recuerda
  al navegar por el módulo (Zustand). Verificado con E2E real: árbol, búsqueda, drag
  dentro, ciclo bloqueado con mensaje, reordenamiento de raíces, eliminación con
  advertencia, cero errores de consola y base limpia.
- **Etapa 8** — parámetros: completada. CRUD por nodo con formulario tipado (entero,
  decimal, booleano, texto, enum y JSON), valor predeterminado con procedencia,
  certeza, unidad, opciones, orden y estado; clave única por nodo con error legible;
  duplicado confirmado y sin clave; desactivar en lugar de borrar cuando hay perfiles;
  ficha con ruta jerárquica, cámara/versión, definición y huecos explícitos para valor
  de configuración (Etapa 09) e historial (Etapa 10). Verificado con E2E: tipos,
  validación decimal, clave duplicada, duplicado, desactivación, edición, ficha,
  borrado seguro y separación predeterminado/perfil (12 sigue siendo 12 con un 20 en
  el perfil).
- **Etapa 9** — perfiles de configuración: completada. Lista de perfiles con
  predeterminado y archivado, alta/edición con validación, duplicado que copia solo
  valores, selección activa recordada, comparación lado a lado predeterminado vs
  perfil, búsqueda y filtros (nodo, tipo, con/sin valor), edición tipada de valores,
  restauración explícita del predeterminado borrando el valor y borrado seguro.
  Verificado con E2E: valores enteros/booleanos/enum, filtros, restauración con
  confirmación, duplicado, renombrado, predeterminado, archivado, eliminación y
  predeterminados intactos en BD; cero errores de consola y base limpia.
- **Etapa 10** — experimentos e historial: completada. Experimentos por perfil con
  estado (planificado/en curso/completado/fallido/no concluyente), fechas de
  inicio/fin, objetivo, hipótesis, observaciones y conclusión; cambios con valor
  anterior/nuevo, motivo, observación y **ruta congelada** (`path_snapshot`),
  aplicados al perfil o solo históricos (columna nueva, D-031); cronología por
  experimento y página de Historial con filtros; comparación de dos experimentos y
  parámetros más modificados; duplicado sin historial y borrado bloqueado si hay
  cambios. Verificado con E2E: aplicado sí toca el perfil (25), solo historial no lo
  toca, ruta intacta tras renombrar el nodo, editar el experimento no altera el
  perfil, comparación y estadísticas, borrados según dependencias.
- **Etapa 11** — API segura: completada. Vercel Function única (`api/[...path].ts`)
  documentada en `docs/API.md`: auth con JWT de Supabase, autorización por RLS sin
  `service_role`, PostgREST vía `fetch`, validación de UUID/tipos, paginación 1–100
  con recorte, límites de árbol y valores, y endpoints de lectura más tres altas
  (experimento, cambio, recomendación). `apply` es `false` por defecto (D-032).
  Verificada contra el proyecto real con 25 comprobaciones: 401 sin/invalid token,
  400 en UUID/tipo/limit inválidos, paginación y recorte, cambio aplicado vs solo
  histórico, recomendación con alcance validado, 404/405 y sin operaciones
  destructivas; base limpia al terminar.
- **Etapa 12** — OpenCode / MCP: completada. Servidor MCP local por stdio
  (`mcp/server.ts`, `npm run mcp:build` / `npm run mcp`) sobre la API con token del
  usuario; 13 herramientas (9 lectura y 4 escritura limitada: crear experimento,
  proponer cambios sin escribir, guardar recomendación y registrar resultado).
  Endpoints nuevos en la API para soportarlo (`GET /versions/:id/configurations`,
  `PATCH /experiments/:id`). Verificado con cliente MCP real: 17/17 comprobaciones.
- **Etapa 13** — importación y exportación: completada. Formato propio JSON
  `gcam-camera-backup` (schemaVersion 1) y `gcam-profile-backup`, documentados en
  `docs/IMPORT-EXPORT.md`; exportación de cámara completa (con o sin experimentos e
  historial) y de perfil individual; importación validada con resumen y errores antes
  de confirmar, slug editable con detección de duplicados y **sin sobrescribir**
  (siempre crea cámara nueva). Se remapean ids y se conservan jerarquía, valores,
  predeterminados, archivado, fechas de experimentos/historial y ruta congelada.
  Verificado con E2E: exportar, borrar la original, importar y comparar round-trip
  (versiones, árbol, parámetros, perfil, valores, experimento e historial) y
  duplicado bloqueado; base limpia.
- **Etapa 14** — calidad y seguridad: completada. Code-splitting por rutas (`lazy` +
  `Suspense`) y vendors separados en Vite; presupuesto inicial ~250 kB (78 gzip) sin
  aviso de chunk; **Vitest autorizado** con 45 pruebas de lógica pura (`npm test`);
  auditoría de accesibilidad y responsive (390/768/escritorio) sin hallazgos; `npm
  audit` deja avisos *high* solo del servidor de desarrollo (Vite 6), aceptados y
  documentados con mitigaciones (D-035).
- **Etapa 15** — despliegue en Vercel: completada. Proyecto en
  `https://gcam-omega.vercel.app` conectado a `tucno21/Gcam-config`; SPA y API en el
  mismo despliegue con `vercel.json` (rewrite con *negative lookahead* que excluye
  `/api`, cabeceras de seguridad y caché de assets) e imports `.js` en `api/` para el
  runtime ESM. Variables `VITE_*` tipo **Config** más Redeploy. Verificado en
  producción con navegador real: login sin aviso, CRUD de cámara (alta, ficha y
  borrado), `/api/health` 200, `/api/cameras` 401 sin token, `anon` → 42501, rutas
  profundas sirviendo la SPA y móvil 390 px sin desbordes; base limpia (D-036).
- **Etapa 16** — espejo de ajustes: completada. La interfaz se replanteó sobre el
  mismo esquema: cámara → versiones → niveles del menú (profundidad ilimitada, dos
  acciones por nivel) → parámetros con **valor actual** y procedencia (`custom`,
  `default` = «Default (From Library)», `unknown`), nota acumulada y **historial
  append-only** con antes/después, comentario y efecto (`mejor`, `igual`, `peor`).
  Se retiraron los perfiles/configuraciones y los experimentos de la interfaz
  (`configurationService`/`experimentService` quedan solo para API/MCP). Duplicar
  versión copia niveles, linaje y opcionalmente valores y notas; **Comparar** usa
  `lineage_id` para listar nuevos, retirados, renombrados, movidos y cambiados. Los
  niveles y parámetros que ya no existen se **retiran** (`is_active = false`) en vez
  de borrarse. La cámara nueva crea su versión «1.0» automáticamente. Migración 06
  aplicada al proyecto alojado. Verificado en local y en producción (20/20 en Chrome
  headless, sin errores de consola), con round-trip de exportación/importación y RLS
  del historial (dueño permitido, usuario ajeno `42501`, `anon` `42501`); `npm test`
  en 46.
- **Interfaz de una sola vista** (D-039): sin «Inicio» ni menú lateral; `/` redirige a
  `/cameras`, la barra superior tiene marca, sesión y salida, y cada cámara es una
  tarjeta con acciones y globo de ayuda. Sin cambios de esquema ni de API.
- **Borrado definitivo de ramas** (D-040): migración 08 con
  `delete_node_branch(uuid)` y `delete_parameter(uuid)`, `security definer`, validadas
  por propietario. «Eliminar» ya borra el historial de esa rama; «Retirar» lo conserva.
- **Proyecto alojado** (`yyfgsvcngakunqwgaktb`, región `aws-1-us-east-1`): esquema
  aplicado con **8 migraciones** registradas en `supabase_migrations.schema_migrations`,
  incluida la de endurecimiento de privilegios (D-025), la marca `applied_to_profile`
  del historial (D-031), el espejo de ajustes (D-037) y el borrado de ramas (D-040).
  Verificado con el usuario real: `anon` → `42501`, CRUD de extremo a extremo en verde
  y todos los bloqueos del modelo activos. El acceso administrativo va por el pooler
  `aws-1-us-east-1.pooler.supabase.com` porque el host directo solo tiene IPv6.
- **Pendiente operativo**: configurar la URL del sitio en el panel
  (*Authentication → URL Configuration → Site URL*, p. ej. `http://localhost:5173`)
  para que los enlaces de correo no caigan en `localhost:3000`. Recomendado resetear
  la contraseña de la base tras terminarla de usar fuera del panel.


