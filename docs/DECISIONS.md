# Decisiones técnicas

Registro breve de decisiones que condicionan el código. Añadir una entrada cuando se
tome una decisión relevante; no reescribir el historial, marcar la anterior como
sustituida.

---

## D-001 — Mantener TypeScript en todo el código base

**Fecha:** 2026-11-18 · **Estado:** vigente

El template ya usa TypeScript 7.0.2 con tipos estrictos. Se mantiene: no migrar a
JavaScript ni introducir archivos `.js` en `src/`.

**Consecuencia:** usar `import type`, prohibido `enum` (`erasableSyntaxOnly`).

---

## D-002 — Tailwind CSS v4 sin archivo de configuración

**Fecha:** 2026-11-18 · **Estado:** vigente

Tailwind 4 se integra con `@tailwindcss/vite` y se personaliza en CSS con `@theme`.
No se crea `tailwind.config.js` ni se instalan plugins de Tailwind.

**Consecuencia:** los tokens de diseño viven en `src/styles/`; la documentación de
Tailwind v3 no aplica.

---

## D-003 — oxlint como único linter; sin Prettier ni ESLint

**Fecha:** 2026-11-18 · **Estado:** vigente

El proyecto trae `oxlint` configurado (`.oxlintrc.json`). Añadir un segundo linter o
un formateador no está justificado y agrega dependencias.

**Consecuencia:** `npm run lint` es la verificación de estilo; el formato se sigue
manualmente (2 espacios, comillas simples, sin punto y coma).

---

## D-004 — Lista cerrada de dependencias

**Fecha:** 2026-11-18 · **Estado:** vigente

Solo se pueden instalar: `zustand`, `lucide-react`, `axios`, `@dnd-kit/core`,
`@dnd-kit/sortable`, `@dnd-kit/utilities`, `@supabase/supabase-js`,
`react-router-dom`. Cualquier otra requiere autorización expresa y entrada en este
archivo.

**Consecuencia:** formularios, tablas, diálogos, validación y notificaciones se
implementan a mano.

---

## D-005 — Supabase como base de datos, auth y RLS

**Fecha:** 2026-11-18 · **Estado:** vigente

Postgres gestionado con Auth incluido y RLS obligatorio. El frontend usa solo la
clave pública (anon/publishable).

**Consecuencia:** nunca `service_role` en el navegador; la seguridad no depende de la
UI.

---

## D-006 — Acceso a datos centralizado en `src/services/`

**Fecha:** 2026-11-18 · **Estado:** vigente

Las vistas no importan `@supabase/supabase-js`. Cada dominio expone un objeto de
servicio con funciones tipadas y errores normalizados a `AppError`.

**Consecuencia:** cambiar de proveedor o añadir la API de la Etapa 11 no toca las
vistas.

---

## D-007 — Zustand solo para estado de interfaz

**Fecha:** 2026-11-18 · **Estado:** vigente

Selección actual de cámara/versión/perfil, filtros y preferencias. Los datos
persistentes no se copian al store: se consultan de nuevo (fuente de verdad única).

---

## D-008 — Prohibido almacenar imágenes o videos

**Fecha:** 2026-11-18 · **Estado:** vigente

Sin tablas, columnas, buckets ni componentes multimedia. Los resultados de
experimentos son texto y datos estructurados.

---

## D-009 — Árbol con `parent_id` + `sort_order`; rutas calculadas

**Fecha:** 2026-11-18 · **Estado:** vigente

Profundidad ilimitada con autorreferencia, no con tablas por nivel ni rutas
materializadas. La ruta se calcula desde las relaciones.

**Consecuencia:** validar ciclos y misma versión en el servicio antes de cada
movimiento; los históricos guardan su propia instantánea de ruta.

---

## D-010 — Valores en JSONB validados por tipo

**Fecha:** 2026-11-18 · **Estado:** vigente (implementación en Etapa 3)

`configuration_values.value` y `parameters.default_value` son JSONB para no forzar
todo a número. Un trigger valida que el tipo JSON coincida con `parameters.data_type`
y que los `enum` estén en `allowed_values`.

**Alternativa descartada:** columnas separadas por tipo (duplica la lógica de lectura).

---

## D-011 — Propiedad anclada en `cameras.owner_id`

**Fecha:** 2026-11-18 · **Estado:** vigente (implementación en Etapa 3)

`cameras.owner_id` referencia `auth.users`; el resto de tablas deriva su propiedad por
relaciones y RLS usa helpers `app.owns_camera` / `app.owns_version`.

**Alternativa descartada:** `owner_id` duplicado en cada tabla (riesgo de
inconsistencia).

---

## D-012 — Sin runner de tests hasta autorización

**Fecha:** 2026-11-18 · **Estado:** pendiente

No existe script `test`. Vitest u otro runner no está en la lista aprobada. Hasta que
se autorice, la verificación es `build` + `lint` + pruebas manuales documentadas.

---

## D-013 — Idioma: docs y UI en español, identificadores en inglés

**Fecha:** 2026-11-18 · **Estado:** vigente

Los documentos, comentarios y textos visibles van en español. Nombres de variables,
funciones, tipos y tablas en inglés para mantener consistencia técnica.

---

## D-014 — Engram como memoria de continuidad del desarrollo

**Fecha:** 2026-11-18 · **Estado:** vigente

Se registra el cierre de cada etapa y las decisiones relevantes. Engram no sustituye
`AGENTS.md` ni `docs/` y nunca contiene secretos.

---

## D-015 — Tema oscuro único, sin selector de tema

**Fecha:** 2026-11-18 · **Estado:** vigente

La interfaz se construye solo en modo oscuro (`color-scheme: dark`) con contraste AA
sobre `#0a0b0d`. Un segundo tema duplicaría tokens y estados sin una necesidad
planteada.

**Consecuencia:** los colores siempre se referencian con tokens de
`src/styles/theme.css`; si algún día se añade tema claro, se hace con un mapa de
tokens, no reescribiendo clases.

---

## D-016 — Imports locales sin extensión

**Fecha:** 2026-11-18 · **Estado:** vigente

El proyecto usa resolución de bundler. Todos los imports locales van sin extensión
(`../components/layout/PageHeader`), incluido `main.tsx`.

**Consecuencia:** no mezclar `./App` con `./App.tsx`; `allowImportingTsExtensions`
queda habilitado pero sin uso.

---

## D-017 — Marcadores de etapa en lugar de acciones falsas

**Fecha:** 2026-11-18 · **Estado:** vigente (se retira al cerrar la Etapa 12)

Las vistas cuya etapa no ha llegado muestran `PendingStage` con lo que habrá y en qué
etapa llega. Las acciones aún no implementadas responden con un toast que lo explica,
en vez de un botón deshabilitado sin contexto o un dato inventado.

**Consecuencia:** no hay datos de demostración falsos en la interfaz; cuando llega la
etapa real, el marcador se sustituye por la vista y su servicio.

---

## D-018 — Instalación progresiva de dependencias

**Fecha:** 2026-11-18 · **Estado:** vigente

Solo se instalan las dependencias autorizadas que la etapa en curso necesita:
`react-router-dom` y `lucide-react` en la Etapa 2. `zustand` y `axios` entrarán con la
capa de datos, `@supabase/supabase-js` en la Etapa 4 y `@dnd-kit/*` en la Etapa 7.

**Motivo:** evitar dependencias sin uso y detectar conflictos de peer dependencies
(React 19) en el momento en que cada una se integra.

---

## D-019 — La integridad del modelo vive en la base de datos

**Fecha:** 2026-11-18 · **Estado:** vigente

Además de los `CHECK` y las claves foráneas, la base valida con triggers lo que la
aplicación también comprobará: forma del valor JSONB según el tipo, `enum` dentro de
`allowed_values`, parámetro de la misma versión que el perfil o el experimento, y
árbol sin ciclos ni cruces de versión.

**Motivo:** la UI no es una capa de seguridad. Un servicio con un bug o una llamada
directa a la API REST de Supabase no deben poder guardar datos incoherentes.

**Consecuencia:** los servicios de la Etapa 4 validan antes de escribir para dar
mensajes claros, pero la base rechaza igualmente lo inválido. Si una regla cambia, se
cambia en SQL y en el servicio en el mismo cambio.

---

## D-020 — `anon` sin privilegios de tabla; historial append-only por doble barrera

**Fecha:** 2026-11-18 · **Estado:** vigente

`anon` no recibe `select`/`insert`/`update`/`delete` sobre ninguna tabla: sin sesión
la consulta falla con `42501` antes de evaluar políticas. `authenticated` recibe solo
las operaciones que sus políticas permiten, y `parameter_changes` únicamente `select`
e `insert` (sin política ni privilegio de `update`/`delete`).

**Motivo:** RLS ya bloquea filas, pero reducir privilegios elimina superficie y hace
que un `delete` accidental sobre el historial falle de forma explícita.

**Consecuencia:** cualquier tabla nueva debe recibir `revoke` para `anon` y sus
`grant` explícitos en la misma migración que la crea.

> **Corrección (D-025):** en el proyecto alojado de Supabase los *default privileges*
> conceden `ALL` a `authenticated` al crear cualquier tabla, incluidos `update`,
> `delete` y `truncate`. La migración `20261118120300_privileges_hardening.sql`
> revoca esos extras: el historial quedó en `select`/`insert` y ninguna tabla
> conserva `references`/`trigger`/`truncate`. Toda migración nueva debe terminar con
> la misma revocación.

---

## D-021 — Semilla ficticia opcional, nunca automática en remoto

**Fecha:** 2026-11-18 · **Estado:** vigente

`supabase/seed.sql` solo crea datos marcados como **ficticios** y se detiene si no
existe ningún usuario en `auth.users`. Se ejecuta en local con `supabase db reset`;
en un proyecto alojado se aplica a mano con `psql` si se quiere.

**Motivo:** no contaminar un proyecto real con datos de demostración ni inventar
parámetros de LMC, AGC o BSG. `db push` no ejecuta semillas, lo cual es deseado.

**Consecuencia:** la interfaz de las etapas 5–10 se construye con datos reales del
usuario; la semilla es solo una ayuda local.

---

## D-022 — Clave pública «publishable» y nombre de la variable de entorno

**Fecha:** 2026-11-18 · **Estado:** vigente

El proyecto usa el sistema nuevo de claves de Supabase: la variable documentada es
`VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`). El cliente acepta además
`VITE_SUPABASE_ANON_KEY` como respaldo para proyectos antiguos. Ambas son claves
públicas y su alcance lo decide RLS.

**Motivo:** es la clave que emite hoy el panel de Supabase; mantener el nombre
`anon` como único nombre obligaba a renombrar valores a mano.

**Consecuencia:** nunca se añade una variable con clave secreta. Si el panel entrega
una `secret key`, no se usa en el frontend bajo ningún concepto.

---

## D-023 — `AppError` como único contrato de error

**Fecha:** 2026-11-18 · **Estado:** vigente

`lib/errors/AppError.ts` define `AppError` (código + mensaje legible) y `toAppError()`,
que traduce códigos de PostgreSQL/PostgREST, errores de Auth, fallos de red y errores
de Axios. Los servicios son el único punto que llama a `toAppError`; las vistas solo
muestran `error.message`.

**Motivo:** el criterio de la etapa exige errores entendibles sin dispersar `if`
sobre códigos en cada componente.

**Consecuencia:** un error nuevo que merezca mensaje propio se añade al mapa de
`AppError.ts`, no en la vista. Los detalles técnicos van en `details` y no se muestran.

---

## D-024 — Acceso privado con Supabase Auth y sesión persistida por `supabase-js`

**Fecha:** 2026-11-18 · **Estado:** vigente

RLS exige `authenticated`, así que la Etapa 4 incluye la pantalla `/login`, la guarda
`RequireSession` y un `AuthProvider`. La sesión la persiste `supabase-js` en el
almacenamiento del navegador bajo la clave `gcam-lab-session`; la aplicación no copia
tokens a Zustand, a `localStorage` propio ni a la URL.

**Motivo:** sin sesión no se puede cumplir el criterio «un CRUD funciona de extremo a
extremo»; ocultar botones no es seguridad.

**Consecuencia:** la prohibición de guardar tokens en el navegador se interpreta como
prohibición de **duplicar** tokens o guardar claves secretas; el almacenamiento de
sesión queda delegado a la librería oficial. Los stores de Zustand solo contienen
estado de interfaz.

---

## D-025 — Revocar los privilegios por defecto de Supabase en cada migración

**Fecha:** 2026-11-18 · **Estado:** vigente

El proyecto alojado de Supabase crea cada tabla con `grant all` implícito a
`authenticated` y `service_role` (*default privileges* del proyecto). Eso incluía
`update`, `delete` y `truncate` sobre `parameter_changes`, la tabla append-only.
En la base local de pruebas esos privilegios no existen, por eso la suite pasó allí
y el hueco solo apareció al verificar el CRUD con un usuario real en el proyecto
remoto. La migración `20261118120300_privileges_hardening.sql` revoca los extras y
deja el historial en `select`/`insert`.

**Motivo:** el diseño de la capa de privilegios se validó en una base limpia, no en
el entorno real de Supabase. La política RLS ya impedía tocar filas del historial
(la operación terminaba en «0 filas afectadas»), pero el error silencioso no es
aceptable: sin revocación no hay mensaje claro ni defensa si una política se
equivoca mañana.

**Consecuencia:** toda migración que cree una tabla termina con la revocación de
`references`, `trigger` y `truncate` a `authenticated`, `revoke all` a `anon` y, si
la tabla es append-only, `revoke all` a `authenticated` seguido del `grant`
explícito. La verificación de privilegios (`information_schema.role_table_grants`)
pasa a formar parte de la comprobación post-migración en el proyecto remoto.

---

## D-026 — Eliminar una cámara solo si está vacía; archivar es el camino normal

**Fecha:** 2026-11-18 · **Estado:** vigente

El catálogo ofrece **Eliminar** únicamente cuando la cámara tiene `versionCount = 0`
(verificado en la interfaz antes de enviar). Si tiene versiones, el botón aparece
deshabilitado con su explicación y el camino es **Archivar** (`is_active = false`),
reversible. La base, además, lo garantiza: el `on delete restrict` de
`camera_versions → cameras` responde `23503`, que `AppError` traduce a «El registro
tiene datos dependientes…».

**Motivo:** la tarea exige no eliminar con dependencias históricas; el borrado físico
es un caso raro (cámara creada por error) y el archivado conserva todo el trabajo.

**Consecuencia:** las vistas jamás intentan un borrado que la base rechazará por
diseño; si aun así ocurre (`23503`), el mensaje sugiere archivar. El mismo criterio
se aplicará a versiones (Etapa 6) y perfiles (Etapa 9). El slug se genera a partir
del nombre (`lib/helpers/slugify`) mientras el usuario no lo edite a mano.

---

## D-027 — La duplicación de estructura siempre es explícita y revisable

**Fecha:** 2026-11-18 · **Estado:** vigente

Crear una versión **nunca** copia parámetros de otra. La copia existe solo como
acción explícita («Duplicar estructura») con diálogo propio: muestra la versión de
origen con su conteo de nodos, la de destino (existente o nueva) y advierte qué se
copia (nodos y definición de parámetros, con jerarquía y orden) y qué no (perfiles,
valores, experimentos e historial). Si la destino ya tiene nodos propios, se avisa
que la copia se añadirá a lo que tenga.

**Motivo:** la tarea lo exige — evitar que el usuario piense que una versión nueva
«hereda» datos — y la copia debe poder revisarse antes de guardar.

**Consecuencia:** `versionService.duplicateStructure` es el único camino de copia y
trabaja por inserción ordenada (padres primero) con remapeo de `parent_id`; los ids
nuevos garantizan que las versiones jamás compartan filas. Las acciones destructivas
o masivas futuras seguirán este patrón de confirmación con impacto detallado.

---

## D-028 — Drag & drop con tres zonas por fila y validación en cliente + base

**Fecha:** 2026-11-18 · **Estado:** vigente

El árbol usa `@dnd-kit` con un asa explícita por fila. Cada fila registra tres
droppables: franja superior (reordenar antes), cuerpo (anidar dentro) y franja
inferior (reordenar después). La detección de colisión es propia: `pointerWithin`
limitado a esas zonas y ordenado por altura ascendente, de modo que las franjas de
10 px ganan sobre el cuerpo. Si el puntero cae sobre la fila sin zona (droppable de
`useSortable`), se interpreta como «anidar».

**Motivo:** `rectIntersection` elegía la fila completa y perdía la intención del
usuario; con `pointerWithin` puro, la primera zona registrada ganaba también en los
bordes inferiores. Tres zonas + prioridad por altura da un comportamiento predecible
sin depender del orden de registro.

**Consecuencia:** mover y reordenar se traducen en `nodeService.move` y
`nodeService.reorder`; los ciclos, el autoparentado y el cruce de versiones se
validan en el servicio con mensajes claros y, de nuevo, en los triggers de la base.
Un movimiento rechazado muestra «Movimiento no permitido» y recarga el árbol para
restaurar el estado real.

---

## D-029 — El valor predeterminado es documentación tipada, no el valor del perfil

**Fecha:** 2026-11-18 · **Estado:** vigente

El formulario de parámetro edita el valor predeterminado con un control propio de su
tipo: entero y decimal se parsean a número, booleano a `true`/`false` reales, enum se
elige de `allowed_values` y JSON se valida con `JSON.parse`. Vacío significa
**desconocido** (null) y fuerza procedencia `unknown`; con valor, la procedencia es
obligatoria y distinta de `unknown`. Duplicar un parámetro siempre pide confirmación y
la copia se crea **sin clave técnica** para no chocar con el índice único
`(node_id, key)`; eliminar solo se permite si no hay valores de perfil (la base
responde `23503` y la UI propone desactivar).

**Motivo:** la tarea exige tipos correctamente representados y una separación
comprobable entre valor predeterminado y valor de configuración; inventar valores o
guardar «1» como texto rompería los filtros y la futura comparación de perfiles.

**Consecuencia:** `ParameterFormDialog` + `features/parameters/validation.ts` son el
único camino de escritura de `parameters`. Los servicios de perfiles (Etapa 9) solo
tocan `configuration_values`. Verificado con E2E: tras guardar 20 en un perfil, el
predeterminado sigue siendo 12.

---

## D-030 — Un perfil solo guarda valores personalizados; el predeterminado no se materializa

**Fecha:** 2026-11-18 · **Estado:** vigente

Al crear un perfil **no se copian parámetros ni valores**: el perfil arranca vacío y
cada fila muestra «sin valor personalizado» junto al predeterminado documentado, que
solo se usa como referencia de comparación. Definir un valor es una acción explícita
y tipada (`ValueDialog` + `TypedValueEditor`); **restaurar** el predeterminado borra
la fila de `configuration_values` (no escribe el valor por defecto). Duplicar un
perfil copia únicamente sus valores personalizados, nunca experimentos ni historial.

**Motivo:** la tarea prohíbe inventar valores y exige que el predeterminado no cambie
al editar un perfil; materializar valores haría imposible distinguir «sin configurar»
de «configurado igual al predeterminado».

**Consecuencia:** las vistas comparan siempre dos columnas (predeterminado / perfil) y
la búsqueda y filtros trabajan sobre parámetros reales de la versión. Borrar un perfil
con experimentos falla por `23503` y la UI sugiere archivarlo. Los contadores de la
lista usan el embed `configuration_values(count)`; la edición de valores se hace fila a
fila, sin guardados masivos que puedan dejar valores a medias.

---

## D-031 — Un cambio se aplica al perfil solo si el usuario lo marca; el historial es inmutable

**Fecha:** 2026-11-18 · **Estado:** vigente

Al registrar un cambio en un experimento se elige explícitamente **«Aplicar al perfil
ahora»** (marcado por defecto). Con la marca, el valor de `configuration_values` se
actualiza y queda el registro en `parameter_changes` con `applied_to_profile = true`;
sin la marca, el perfil no se toca y el registro queda como historial
(`applied_to_profile = false`). La columna se añadió en la migración
`20261118120400_parameter_changes_applied.sql`.

**Motivo:** la tarea exige definir cuándo un cambio afecta al perfil y cuándo es solo
constancia, y prohíbe que editar un experimento antiguo altere la configuración actual.
Sin esta marca la cronología sería ambigua.

**Consecuencia:** editar metadatos de un experimento (título, observaciones,
conclusión, estado) nunca toca el perfil; los cambios no se editan ni borran. La ruta
se guarda como `path_snapshot` (nombres de nodo en el momento) y no se recalcula.
Duplicar un experimento copia solo título/objetivo/hipótesis y perfil: el historial del
original no se replica. Borrar un experimento con cambios falla por `23503` (historial
intocable).

---

## D-032 — API externa en Vercel Functions con JWT + RLS y sin `service_role`

**Fecha:** 2026-11-18 · **Estado:** vigente

La API externa (Etapa 11) vive en `api/` como una única Vercel Function (runtime
Node) que enruta `[...path]`. Valida el JWT con `GET /auth/v1/user` y consulta
PostgREST **con el token del usuario**, de modo que RLS sigue siendo la autoridad.
No existe `service_role` en ningún punto, tampoco en el servidor. Las consultas usan
`fetch` + PostgREST en lugar de `@supabase/supabase-js` porque el cliente inicializa
Realtime y exige WebSocket nativo (Node ≥ 22); en Vercel con Node 20 eso falla y
añadir `ws` habría sido una dependencia no autorizada.

**Motivo:** coste cero, una sola plataforma de despliegue, sin secretos privilegiados
y con la misma garantía de aislamiento que la app.

**Consecuencia:** la API expone solo lectura salvo tres altas controladas
(experimento, cambio, recomendación) y ningún `PUT`/`PATCH`/`DELETE`. `apply` es
`false` por defecto: un cliente externo no cambia un perfil sin pedirlo
explícitamente. El valor anterior y la ruta congelada los calcula el servidor. Los
límites (1–100 filas, árbol ≤ 2 000) y la validación de UUID/tipos viven en la API;
la base valida de nuevo con triggers y RLS.

---

## D-033 — Servidor MCP local por stdio sobre la API, con token de usuario

**Fecha:** 2026-11-18 · **Estado:** vigente

La integración con OpenCode es un servidor MCP **local** (`mcp/server.ts`, compilado a
`mcp/dist/server.mjs`) que habla únicamente con la API de la Etapa 11 por HTTP. Se
lanza con `node` y transporta por stdio; no se despliega nada. Credenciales:
`GCAM_API_URL` y `GCAM_API_TOKEN` (access token de Supabase Auth) por entorno, nunca
en el repositorio.

**Motivo:** cero coste y cero infraestructura extra; el token del usuario mantiene el
aislamiento de RLS sin `service_role`. Un MCP remoto habría exigido otro despliegue y
un flujo OAuth propio.

**Consecuencia:** trece herramientas (nueve de lectura y cuatro de escritura
limitada). No existe herramienta para aplicar cambios a un perfil ni para borrar
datos; `propose_parameter_changes` valida contra datos reales y no escribe;
`save_recommendation` guarda en `ai_recommendations` como `proposed`. El token caduca
(~1 h) y se renueva fuera de la app. Se añadieron dos endpoints a la API para
soportarlo: `GET /versions/:id/configurations` y `PATCH /experiments/:id` (solo
observaciones/conclusión/estado).

---

## D-034 — Respaldo JSON propio, importación aditiva y nunca sobrescritura

**Fecha:** 2026-11-18 · **Estado:** vigente

Formato propio `gcam-camera-backup` (con `schemaVersion: 1`) y
`gcam-profile-backup` para perfiles, documentados en `docs/IMPORT-EXPORT.md`. La
exportación es completa (versiones, árbol, parámetros, perfiles, valores y,
opcionalmente, experimentos con historial). La importación **siempre crea una
cámara nueva**: no mezcla ni sobrescribe datos existentes; el slug es editable y se
bloquea si ya existe. Los `id` del archivo solo relacionan dentro de él y se
remapean al importar.

**Motivo:** el criterio de la etapa pide exportar, borrar una copia de prueba e
importar sin perder relaciones ni valores. La sobrescritura parcial sería mucho más
arriesgada y no aporta al uso real (un usuario, un catálogo).

**Consecuencia:** la validación ocurre **antes** de escribir y detecta formato,
límites, duplicados internos y referencias rotas. Se conservan las fechas de creación
de experimentos e historial (`createdAt`, `startedAt`, `completedAt`) y la ruta
congelada; `updated_at` se recalcula. La importación de XML de LMC/AGC/BSG queda
explícitamente fuera de alcance hasta inspeccionar archivos reales. La app no
importa perfiles sueltos en versiones existentes.

---

## D-035 — Rendimiento, pruebas automatizadas y riesgo aceptado de Vite en desarrollo

**Fecha:** 2026-11-18 · **Estado:** vigente

**Code-splitting**: las páginas de datos se cargan con `lazy()` + `Suspense`
(`app/router/router.tsx`, `AppShell`) y Vite separa vendors (`react-vendor`,
`supabase`, `dnd-kit`). El bundle de entrada bajó de ~730 kB a ~250 kB (78 kB gzip)
y el aviso de chunk > 500 kB desapareció; las páginas llegan bajo demanda.

**Pruebas**: se autorizó **Vitest** (devDependency) para lógica pura. Los tests
conviven con el código (`*.test.ts`) y cubren validadores de cámara, versión,
parámetro, enum/configuración, experimento, árbol, respaldos JSON, `AppError`,
helpers y validación de la API. `npm test` debe pasar antes de cerrar una etapa.

**Accesibilidad y responsive**: auditoría automatizada (headless) de nombres
accesibles en controles, botones, enlaces e imágenes, además de desbordamiento
horizontal en 390 px, 768 px y escritorio, sobre todas las vistas con datos reales y
el diálogo de alta. Sin hallazgos.

**Riesgo aceptado**: `npm audit` mantiene avisos *high* de **Vite 6.2.7** y el árbol
de desarrollo (no del runtime del navegador). Afectan al servidor de desarrollo
(fs.deny, WebSocket, middleware) y su corrección exige un salto de major (Vite 7),
prohibido sin autorización. Mitigaciones: el build de producción es estático (Vite no
corre en Vercel), el dev server limita hosts con `server.allowedHosts`, y el túnel de
desarrollo debe cerrarse al terminar. Se revisará al planificar el salto de major.

---

## D-036 — Despliegue en Vercel: SPA y API en el mismo proyecto

**Fecha:** 2026-11-18 · **Estado:** vigente

**Qué**: la SPA se publica en `https://gcam-omega.vercel.app` (Vercel Hobby,
conectado a `tucno21/Gcam-config`) y la API vive en el mismo proyecto como Vercel
Functions (`api/[...path].ts`), sin backend extra y sin coste añadido.

**Variables**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`, tipo
**Config** (nunca *Secret*: Vercel rechaza marcar como secretas variables `VITE_`
porque se incrustan en el bundle). Cambiarlas exige **Redeploy**.

**Enrutado**: dos reglas en `rewrites`, en este orden:

1. `"/api/(.*)" → "/api/[...path]"`. Con Vercel Functions en `api/`, el
   catch-all solo enruta **un** segmento (`/api/cameras`, `/api/health`); las
   rutas anidadas (`/api/cameras/:id/versions`) respondían el 404 de la
   plataforma. Esta regla las envía a la función única.
2. `"/((?!api/).*)" → /index.html` para la SPA. Un `"/(.*)"` genérico taparía la
   API; un rewrite de `/api` con destino `/api/$1` tampoco vale (no es un archivo
   real y acaba sirviendo la SPA).

**Runtime**: las funciones corren como **ESM** (paquete raíz `"type": "module"`),
por lo que los imports internos de `api/` llevan extensión `.js`
(`./_lib/http.js`). Sin ella: `FUNCTION_INVOCATION_FAILED`.

**Seguridad**: `service_role` sigue sin usarse. Verificado en producción: `/api/*`
sin token → `401`; clave pública con rol `anon` → `42501`; CRUD real con JWT del
usuario funciona bajo RLS.

**Pendiente operativo (manual, fuera del repo)**: en Supabase
*Authentication → URL Configuration* fijar **Site URL**
`https://gcam-omega.vercel.app` y añadir `https://gcam-omega.vercel.app/**` a
*Redirect URLs* para que los correos vuelvan a la app publicada.

---

## D-037 — Espejo de ajustes: niveles, valor actual e historial sin perfiles

**Fecha:** 2026-11-18 · **Estado:** vigente

**Qué cambia.** La Etapa 16 sustituye el editor de árbol abstracto por un **espejo
del menú del teléfono**: cámara → versiones → niveles (`Photo Processing`, `Main
Camera`, `Sharpness`…) → parámetros. Cada nivel tiene dos acciones: «Añadir
subnivel» y «Añadir parámetro». La navegación es nivel a nivel, con breadcrumbs.

**Modelo de valor.**

- `parameters.current_value` + `current_value_source` (`custom` | `default` |
  `unknown`). `default` se muestra literal como «Default (From Library)»: no se
  inventa el número de fábrica.
- `parameters.default_value` sigue siendo la referencia documentada y **nunca** se
  sobrescribe al cambiar el valor actual.
- `parameters.notes` guarda el conocimiento del ajuste, separado del comentario de
  un cambio concreto.

**Historial.** `parameter_changes` deja de exigir experimento. Cada cambio guarda
valor anterior y nuevo con su procedencia, comentario (`reason`), efecto
(`better`/`same`/`worse`/`unknown`) y ruta congelada. Sigue siendo **append-only**:
RLS no concede `update` ni `delete`. Las políticas ahora autorizan por el parámetro
→ nodo → versión, no por el experimento.

**Linaje y comparación.** `parameter_nodes.lineage_id` y `parameters.lineage_id`
identifican el mismo ajuste entre versiones. Duplicar una versión los conserva; los
elementos nuevos reciben otro. «Comparar» empareja por linaje y distingue nuevo,
retirado, renombrado, movido y cambiado. `is_active = false` significa retirado en
esa versión, no borrado.

**Duplicar versión.** Copia niveles, orden, estado y linaje, y opcionalmente los
valores actuales y las notas (casilla marcada por defecto). No copia historial.
Una cámara nueva crea su versión «1.0» para empezar a replicar sin pasos extra.

**Se retira de la interfaz.** Perfiles (`configurations`, `configuration_values`) y
experimentos (`experiments`). Las tablas, sus servicios, la API y el MCP se
conservan para no romper datos ni integraciones existentes; no se añade código nuevo
que dependa de ellos. La exportación JSON incluye ahora `lineageId`, notas, valor
actual y el historial de valores (`history`), manteniendo compatibilidad con
respaldos anteriores (campos opcionales).

**Consecuencia.** La complejidad baja: desaparecen tres pestañas y dos conceptos
(perfil activo, experimento). El trabajo diario es abrir un nivel, cambiar un valor
y escribir qué pasó.

