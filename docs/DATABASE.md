# Modelo de datos

> **Estado:** implementado en la **Etapa 3**. Las migraciones viven en
> `supabase/migrations/` y este documento es el contrato: si el esquema cambia, se
> actualiza aquí en el mismo cambio. Cómo aplicarlas: `docs/SETUP-SUPABASE.md`.

Base de datos: PostgreSQL de Supabase. Convenciones: `snake_case`, tablas en plural,
`uuid` como PK (`gen_random_uuid()`), `timestamptz` para fechas, `created_at` /
`updated_at` con trigger de actualización.

## Diagrama

```text
auth.users
   │ 1
   ▼ n
cameras
   │ 1
   ▼ n
camera_versions ──1:n── parameter_nodes (árbol, parent_id autorreferente)
   │                        │ 1
   │                        ▼ n
   │                    parameters
   │                        │ 1
   │ 1                      │ n
   ▼ n                      ▼
configurations ──1:n── configuration_values
   │ 1
   ▼ n
experiments ──1:n── parameter_changes ──n:1── parameters

ai_recommendations ──n:1── camera_versions
                   └─n:1── configurations (nullable)
                   └─n:1── experiments (nullable)
```

## Propiedad y aislamiento

La aplicación es privada, pero el aislamiento se aplica desde el inicio.

- `cameras.owner_id uuid not null default auth.uid() references auth.users(id)` es
  **el ancla de propiedad**. Todo lo demás se deriva por relaciones; no se duplica
  `owner_id`. El valor por defecto evita que el cliente tenga que enviarlo, y la
  política `with check` impide escribir a nombre de otro.
- Para mantener las políticas RLS legibles y rápidas se crearán dos funciones
  `security definer` (con `search_path` fijo) en el esquema `app`:
  - `app.owns_camera(camera_id uuid) → boolean`
  - `app.owns_version(version_id uuid) → boolean`
- No existen catálogos públicos en la primera versión. Toda tabla exige sesión.

## Tablas

### `cameras`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `owner_id` | uuid FK → `auth.users` | `on delete cascade` |
| `name` | text not null | nombre visible (LMC, AGC, BSG…) |
| `slug` | text not null | `^[a-z0-9]+(-[a-z0-9]+)*$`, único por dueño |
| `description` | text | |
| `developer` | text | opcional |
| `website_url` | text | opcional |
| `is_active` | boolean not null default true | |
| `created_at` / `updated_at` | timestamptz | |

- Único: `(owner_id, slug)`.
- Índices: `(owner_id, is_active)`.

### `camera_versions`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `camera_id` | uuid FK → `cameras` | `on delete restrict` |
| `version` | text not null | etiqueta visible, ej. `8.4` |
| `release_label` | text | opcional |
| `notes` | text | |
| `is_default` | boolean not null default false | versión preseleccionada en UI |
| `is_active` | boolean not null default true | archivar en lugar de borrar |
| `created_at` / `updated_at` | timestamptz | |

- Único: `(camera_id, version)`.
- Índice parcial único `(camera_id) where is_default` → una sola versión por defecto.
- Índice: `(camera_id, is_active)`.

### `parameter_nodes`

Árbol de profundidad ilimitada por versión.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `camera_version_id` | uuid FK → `camera_versions` | `on delete restrict` |
| `parent_id` | uuid FK → `parameter_nodes` | nullable; `on delete restrict` |
| `name` | text not null | |
| `description` | text | |
| `node_type` | text not null default `'group'` | CHECK: `category`, `group`, `subgroup` |
| `sort_order` | integer not null default 0 | orden entre hermanos |
| `created_at` / `updated_at` | timestamptz | |

- Índices: `(camera_version_id, parent_id, sort_order)`.
- Único recomendado: `unique nulls not distinct (camera_version_id, parent_id, name)`.
- **Invariantes**: sin ciclos, mismo `camera_version_id` para padre e hijo,
  `parent_id <> id`. El trigger `app.enforce_node_tree` las garantiza en la base y
  `nodeService` las valida antes de escribir para dar mensajes claros.
- Borrado de una rama: se hace explícitamente en transacción, hijos primero. Nunca
  por cascada silenciosa.

### `parameters`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `node_id` | uuid FK → `parameter_nodes` | `on delete restrict` |
| `key` | text | clave técnica si se conoce; nullable |
| `name` | text not null | |
| `description` | text | |
| `data_type` | text not null | CHECK: `integer`, `decimal`, `boolean`, `string`, `enum`, `json` |
| `unit` | text | opcional |
| `default_value` | jsonb | `null` = desconocido |
| `default_value_source` | text not null default `'unknown'` | CHECK: `documentation`, `original_file`, `observation`, `unknown` |
| `default_value_confidence` | text | CHECK: `low`, `medium`, `high`, null |
| `allowed_values` | jsonb | array, solo si `data_type = 'enum'` |
| `sort_order` | integer not null default 0 | |
| `is_active` | boolean not null default true | |
| `created_at` / `updated_at` | timestamptz | |

- Índices: `(node_id, sort_order)`, `(node_id, key)` parcial único
  `where key is not null`.
- `default_value` es tipado en JSONB y su forma debe corresponder a `data_type`.
- El valor predeterminado es documentación de referencia: ninguna operación de
  perfil lo modifica.

### `configurations`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `camera_version_id` | uuid FK → `camera_versions` | `on delete restrict` |
| `name` | text not null | |
| `description` | text | |
| `is_default` | boolean not null default false | |
| `is_active` | boolean not null default true | archivar en lugar de borrar |
| `created_at` / `updated_at` | timestamptz | |

- Único: `(camera_version_id, name)`.
- Índice parcial único `(camera_version_id) where is_default`.

### `configuration_values`

Valor **actual** de un parámetro en un perfil.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `configuration_id` | uuid FK → `configurations` | `on delete cascade` |
| `parameter_id` | uuid FK → `parameters` | `on delete restrict` |
| `value` | jsonb not null | tipado según `parameters.data_type` |
| `notes` | text | |
| `updated_at` | timestamptz not null default now() | |

- Único: `(configuration_id, parameter_id)`.
- Trigger `app.validate_configuration_value()`: verifica que el `jsonb_typeof` del
  valor coincida con `data_type` del parámetro y que un `enum` pertenezca a
  `allowed_values`.
- Un parámetro sin fila aquí significa **“sin valor personalizado”**; no se
  materializan valores predeterminados.

### `experiments`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `configuration_id` | uuid FK → `configurations` | `on delete restrict` |
| `title` | text not null | |
| `objective` | text | |
| `hypothesis` | text | |
| `status` | text not null default `'planned'` | CHECK: `planned`, `in_progress`, `completed`, `failed`, `inconclusive` |
| `observations` | text | |
| `conclusion` | text | |
| `started_at` | timestamptz | |
| `completed_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

- Índices: `(configuration_id, created_at desc)`, `(status)`.

### `parameter_changes`

Historial **append-only** de cambios dentro de un experimento.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `experiment_id` | uuid FK → `experiments` | `on delete restrict` |
| `parameter_id` | uuid FK → `parameters` | `on delete restrict` |
| `previous_value` | jsonb | `null` si no había valor |
| `new_value` | jsonb | |
| `reason` | text | |
| `observation` | text | |
| `path_snapshot` | jsonb | instantánea de nombres jerárquicos al momento del cambio |
| `created_at` | timestamptz not null default now() | |

- Sin `update` ni `delete` para clientes: solo `insert` y `select` por RLS.
- `path_snapshot` conserva la ruta aunque luego se renombre un nodo.

### `ai_recommendations`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `camera_version_id` | uuid FK → `camera_versions` | `on delete restrict` |
| `configuration_id` | uuid FK → `configurations` | nullable, `on delete set null` |
| `experiment_id` | uuid FK → `experiments` | nullable, `on delete set null` |
| `title` | text not null | |
| `reasoning_summary` | text | |
| `suggested_changes` | jsonb not null | array; la forma de cada elemento se define en la Etapa 12 |
| `status` | text not null default `'proposed'` | CHECK: `proposed`, `accepted`, `rejected`, `tested` |
| `created_at` / `updated_at` | timestamptz | |

- Una recomendación **nunca** aplica cambios por sí misma: solo se registra.

## Funciones y triggers

Todo lo que puede verificarse en la base se verifica en la base: la interfaz y los
servicios no son la última línea de defensa.

| Objeto | Tipo | Regla |
|---|---|---|
| `app.set_updated_at()` | trigger | mantiene `updated_at` en las 8 tablas que lo tienen |
| `app.value_matches_type(data_type, value, allowed_values)` | función `immutable` | forma del JSONB según el tipo declarado |
| `app.validate_parameter_definition()` | trigger `before insert/update` | `default_value` compatible con `data_type`; `enum` con lista de cadenas |
| `app.validate_configuration_value()` | trigger `before insert/update` | tipo del valor y parámetro de la **misma versión** que el perfil |
| `app.enforce_node_tree()` | trigger `before insert/update` | padre de la misma versión, sin ciclos ni autoparentado |
| `app.validate_parameter_change()` | trigger `before insert/update` | el parámetro del cambio pertenece a la versión del experimento |
| `app.validate_recommendation_scope()` | trigger `before insert/update` | perfil y experimento de la misma versión que la recomendación |
| `app.owns_camera(uuid)` / `app.owns_version(uuid)` | función `security definer`, `stable` | propiedad derivada para RLS |

Los triggers de validación son `security definer` con `search_path = ''`: validan
contra la tabla completa aunque RLS oculte filas, y RLS sigue decidiendo si la
escritura está permitida. `app.owns_*` también es `security definer` para no entrar
en recursión de políticas; `anon` no puede ejecutarlas.

Además de los `CHECK`, quedan garantizadas por la base estas reglas de negocio:

- `default_value` nulo implica `default_value_source = 'unknown'`: no se inventa un
  valor para completar el campo.
- Un `enum` exige `allowed_values` y sus elementos deben ser cadenas.
- Un valor de perfil no puede apuntar a un parámetro de otra versión.
- Un nodo no puede colgar de otra versión ni crear un ciclo.
- El historial no puede mezclar un experimento con parámetros de otra versión.

## Reglas de borrado

| Origen → destino | Regla | Motivo |
|---|---|---|
| `cameras` → `camera_versions` | `restrict` | no perder historia; archivar |
| `camera_versions` → `parameter_nodes` | `restrict` | borrado explícito del árbol |
| `parameter_nodes` → `parameter_nodes` | `restrict` | subárbol explícito, sin cascadas |
| `parameter_nodes` → `parameters` | `restrict` | evitar huérfanos silenciosos |
| `configurations` → `configuration_values` | `cascade` | los valores no existen sin el perfil |
| `experiments` → `parameter_changes` | `restrict` | historial intocable |
| `*` → `ai_recommendations.*` | `set null` | la recomendación sobrevive como registro |

El borrado físico de cámaras/versiones solo se permite cuando no existen datos
históricos; en caso contrario la UI ofrece **archivar** (`is_active = false`).

## RLS

Implementado en `20261118120200_rls_policies.sql`.

- `alter table … enable row level security` en las **nueve** tablas.
- Políticas por operación (`select`, `insert`, `update`, `delete`) y `to authenticated`.
  Ninguna usa `using (true)`.
- `cameras`: `owner_id = (select auth.uid())`.
- `camera_versions`, `parameter_nodes`, `configurations`, `ai_recommendations`:
  `app.owns_camera(...)` / `app.owns_version(...)`.
- `parameters`, `configuration_values`, `experiments`, `parameter_changes`: `exists`
  sobre el padre inmediato + `app.owns_version(...)`.
- En `update`, el `with check` repite la condición: no se puede «mover» una fila a
  otro dueño ni colgarla de datos ajenos.
- `parameter_changes`: solo `select` e `insert`. No tiene políticas de `update` ni
  `delete` y tampoco privilegios de tabla para esas operaciones (doble barrera).
- `anon` no tiene **ningún** privilegio de tabla: sin sesión la consulta falla con
  `42501` antes de evaluar políticas. `authenticated` recibe exactamente los
  privilegios que sus políticas permiten.
- La semilla y las migraciones se ejecutan como dueño de las tablas, por eso pueden
  escribir sin sesión; nunca se ejecutan desde el navegador.

## Migraciones

- Ruta: `supabase/migrations/YYYYMMDDHHmmss_descripcion.sql`, aplicadas en orden con
  la CLI (`supabase db push`). No se hacen cambios manuales invisibles en el panel.
- Reproducibles desde una base vacía y no destructivas por defecto. Para reconstruir
  la base local: `supabase db reset`.
- La semilla de demostración vive en `supabase/seed.sql`, está marcada como
  **ficticia** y se omite si no existe ningún usuario.
- Pruebas de aislamiento en `supabase/tests/rls.sql` (solo base local).
- Procedimiento completo: `docs/SETUP-SUPABASE.md`.
