# Puesta en marcha de Supabase

**Estado:** Etapa 4. El esquema está **aplicado y verificado** en el proyecto
alojado `yyfgsvcngakunqwgaktb` (9 tablas, 34 políticas, 13 triggers y la migración de
privilegios). Las migraciones quedaron registradas en
`supabase_migrations.schema_migrations`, igual que lo haría `supabase db push`, así
que futuras migraciones entran por la CLI o por SQL Editor. Este documento explica los
caminos posibles.

---

## Qué hay en el repositorio

| Ruta | Contenido |
|---|---|
| `supabase/config.toml` | configuración del CLI (puertos locales, semilla, Auth) |
| `supabase/migrations/20261118120000_init_schema.sql` | 9 tablas, constraints e índices |
| `supabase/migrations/20261118120100_functions_triggers.sql` | `updated_at`, validación de valores, guardas del árbol, helpers RLS |
| `supabase/migrations/20261118120200_rls_policies.sql` | RLS, políticas por operación y privilegios |
| `supabase/migrations/20261118120300_privileges_hardening.sql` | revoca los privilegios por defecto de Supabase (D-025) |
| `supabase/migrations/20261118120400_parameter_changes_applied.sql` | marca `applied_to_profile` en el historial (D-031) |
| `supabase/seed.sql` | semilla **ficticia** y opcional |
| `supabase/tests/rls.sql` | pruebas de aislamiento e integridad |

Las migraciones se aplican **en orden de nombre** y son reproducibles desde una base
vacía. No borran datos.

---

## Camino rápido · SQL Editor del panel (sin CLI)

Sirve para aplicar el esquema a un proyecto alojado sin instalar nada. Es el camino
usado para el proyecto actual:

1. Abre el proyecto en <https://supabase.com/dashboard> → **SQL Editor**.
2. Pega **completo** el contenido de cada migración y ejecútala, en este orden:
   1. `supabase/migrations/20261118120000_init_schema.sql`
   2. `supabase/migrations/20261118120100_functions_triggers.sql`
   3. `supabase/migrations/20261118120200_rls_policies.sql`
3. Comprueba en **Table Editor** que existen las 9 tablas y en **Database → Policies**
   que todas tienen RLS activado.
4. Crea el usuario con el que entrarás a la app (**Authentication → Users → Add user**,
   con *Auto Confirm User* marcado) o regístrate desde `/login` y confirma el correo.
5. Copia la URL y la clave pública (**Settings → API Keys → publishable**) en
   `.env.local`.

> El SQL Editor ejecuta como dueño de las tablas, por eso puede crear objetos sin
> sesión. No sustituye a las migraciones versionadas: si el esquema cambia, se crea
> una migración nueva.

---

## Antes de empezar

- El repositorio no guarda claves. Los valores reales viven en `.env.local`
  (ignorado por git); `.env.example` solo tiene nombres y valores ficticios.
- La aplicación usa **solo la clave pública** (`anon` / publishable). La clave
  `service_role` no se usa en ningún punto del frontend ni de este repositorio.
- La contraseña de la **base de datos** (rol `postgres`) es distinta de la clave de
  `.env.local`; se restaura en *Project Settings → Database → Database password*.
  Nunca se guarda en el repositorio.
- Conexión administrativa a este proyecto: el host directo
  `db.<ref>.supabase.co` es **solo IPv6**; desde redes sin IPv6 hay que usar el
  pooler: `aws-1-us-east-1.pooler.supabase.com`, puerto `5432` (sesión), usuario
  `postgres.<ref>`. La región se ve en *Project Settings → Database → Connection
  string*.
- La CLI de Supabase es una **herramienta**, no una dependencia del proyecto. Se usa
  con `npx supabase@latest …` (o una instalación global) y no se agrega a
  `package.json` sin autorización.

---

## Camino A · proyecto alojado en Supabase

1. Crea el proyecto en el panel de Supabase y anota el *project ref* (`https://<ref>.supabase.co`).
2. Autentica la CLI y vincula el repositorio:

   ```bash
   npx supabase@latest login
   npx supabase@latest link --project-ref <ref>
   ```

3. Aplica las migraciones:

   ```bash
   npx supabase@latest db push
   ```

   - En la CLI v2 `db push` apunta al proyecto vinculado.
   - En la CLI v3+ hay que añadir `--remote` (`db push --remote`); sin ese flag
     empuja a la base local. Consulta `npx supabase@latest db push --help` si el
     comando no se comporta como esperas.
   - La CLI puede pedir la contraseña de la base de datos.

4. La semilla **no** se aplica con `db push`. Es opcional y requiere que exista al
   menos un usuario:

   ```bash
   psql "<cadena-de-conexión>" -f supabase/seed.sql
   ```

   Si `auth.users` está vacío, la semilla no hace nada y lo avisa con un `notice`.

5. Crea `.env.local` a partir de `.env.example` con la URL y la clave pública del
   proyecto (`VITE_SUPABASE_PUBLISHABLE_KEY`). La Etapa 4 ya las consume.

6. Comprueba en el panel que las nueve tablas tienen **RLS activado** y que `anon`
   no puede leerlas.

---

## Camino B · base local (Docker)

Requiere Docker Desktop en ejecución.

```bash
npx supabase@latest start        # levanta Postgres, Auth, API y Studio
npx supabase@latest db reset     # aplica migraciones + supabase/seed.sql
npx supabase@latest stop         # al terminar
```

Con la base local levantada se pueden ejecutar las pruebas de aislamiento:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/rls.sql
```

El script abre una transacción, crea dos usuarios de prueba, ejecuta las
comprobaciones y termina en `ROLLBACK`: no deja datos. **Nunca debe ejecutarse
contra un proyecto alojado**, porque escribe usuarios en `auth.users`.

---

## Qué comprueba `supabase/tests/rls.sql`

- `anon` no puede leer ni insertar en ninguna tabla (`42501`).
- Un usuario autenticado ve exactamente sus filas en las nueve tablas.
- No puede leer ni actualizar filas ajenas, ni crear hijos bajo datos ajenos.
- No puede cambiar el `owner_id` de una cámara propia.
- Un `integer` rechaza texto y decimales; un `enum` rechaza valores fuera de la lista.
- Un valor de perfil no puede referirse a un parámetro de otra versión.
- El árbol rechaza autoparentado, ciclos y padres de otra versión.
- `parameter_changes` rechaza `update` y `delete`, y acepta solo inserciones propias.

Cada comprobación imprime `OK · …` o aborta con `FALLO · …`.

> **Validación de la Etapa 3:** las tres migraciones y la suite completa se
> ejecutaron sobre **PostgreSQL 18.6** (PGlite, en un directorio temporal) con un
> shim de `auth.users`, `auth.uid()` y los roles `anon` / `authenticated`, que son lo
> único que Supabase aporta y no está en este repositorio. Resultado: 9 tablas, 34
> políticas, 13 triggers y todas las comprobaciones en verde. Lo que falta es
> aplicarlas al proyecto alojado, no reescribirlas.

---

## Añadir una migración nueva

```bash
npx supabase@latest migration new nombre_descriptivo
```

Se crea `supabase/migrations/<timestamp>_nombre_descriptivo.sql`. Reglas:

- Solo cambios aditivos o con migración de datos explícita; nada de `drop table`
  silencioso.
- Si cambia el modelo, se actualiza `docs/DATABASE.md` en el mismo cambio.
- Las políticas nuevas van en su propia migración si tocan tablas existentes.

---

## Seguridad

- `anon` no tiene privilegios de tabla: sin sesión no se puede ni intentar una
  consulta. Con sesión, RLS limita cada fila a su dueño.
- La propiedad se ancla en `cameras.owner_id`; el resto se deriva por relaciones.
- No se crean buckets de almacenamiento: el proyecto no guarda imágenes ni video.
- Si alguna vez se filtra la clave `anon`, el daño está acotado por RLS; si se
  filtrara una clave privilegiada, hay que rotarla de inmediato y revisar los
  registros de acceso.
