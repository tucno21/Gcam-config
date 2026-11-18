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

