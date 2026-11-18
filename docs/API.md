# API para herramientas externas (Etapa 11)

API de solo lectura para el catálogo, más tres altas controladas (experimentos,
cambios y recomendaciones). Pensada para OpenCode/MCP y cualquier automatización
propia. **No hay endpoints destructivos** (sin `PUT`, `PATCH` ni `DELETE`).

- Implementación: Vercel Functions (`api/[...path].ts`, runtime Node).
- Datos: PostgREST de Supabase. Auth: Supabase Auth.
- Seguridad: JWT del usuario + **RLS**. La API **no** usa `service_role`, así que
  no puede saltarse el aislamiento aunque tuviera un bug.

## Autenticación

Todas las rutas salvo `GET /api/health` exigen:

```http
Authorization: Bearer <access_token de Supabase>
```

El token se obtiene con Supabase Auth (por ejemplo
`POST /auth/v1/token?grant_type=password`). Un token inválido o caducado responde
`401 unauthorized`. La autorización es la del propio usuario: solo ve y escribe sus
filas (RLS).

## Formato de respuesta

Éxito con colección:

```json
{
  "data": [ ... ],
  "meta": { "limit": 25, "offset": 0, "total": 42 }
}
```

Éxito con un recurso: `{ "data": { ... } }`

Error:

```json
{ "error": { "code": "bad_request", "message": "«limit» debe ser un entero ≥ 1." } }
```

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `bad_request` | UUID, tipo, límite o cuerpo no válido |
| 401 | `unauthorized` | sin token o token inválido/caducado |
| 403 | `forbidden` | RLS o privilegios impiden la operación |
| 404 | `not_found` | no existe o no es del usuario |
| 405 | `method_not_allowed` | método no soportado en esa ruta |
| 409 | `conflict` | duplicado o dependencia (FK) |
| 429 | `rate_limit` | reservado para límites de plataforma |
| 500 | `server_error` | fallo inesperado (sin detalles internos) |

## Paginación y límites

- `limit`: 1–100 (por defecto **25**; valores mayores se recortan a 100).
- `offset`: ≥ 0 (por defecto 0).
- `search`: texto (≤ 80 caracteres, saneado) para nombre/clave.
- El árbol se limita a 2 000 nodos y `meta.truncated` avisa si se recortó.
- Los valores de un perfil se limitan a 2 000 filas; los cambios por experimento a
  1 000.

## Endpoints

### Salud

`GET /api/health` — público, sin datos: `{ "data": { "status": "ok", "time": "…" } }`

### Cámaras

`GET /api/cameras?search=&active=active|archived|all&limit=&offset=`

Devuelve cámaras con `versionCount`.

`GET /api/cameras/:cameraId`

`GET /api/cameras/:cameraId/versions?active=&limit=&offset=`

Versiones con `nodeCount` y `configurationCount`.

### Versiones

`GET /api/versions/:versionId` — versión con conteos.

`GET /api/versions/:versionId/tree`

Nodos planos ordenados por `sortOrder` (`parentId` reconstruye la jerarquía):

```json
{
  "data": [
    { "id": "…", "parentId": null, "name": "Base", "nodeType": "category", "sortOrder": 0 }
  ],
  "meta": { "total": 12, "truncated": false }
}
```

`GET /api/versions/:versionId/parameters?nodeId=&search=&limit=&offset=`

Parámetros de la versión (o de un nodo concreto), paginados.

### Parámetros

`GET /api/parameters/:parameterId`

Incluye `parameter`, `node`, `cameraVersionId` y `path` (nombres desde la raíz,
calculados desde las relaciones).

### Perfiles

`GET /api/configurations/:configurationId`

Perfil con `values`: cada valor actual junto a los datos del parámetro
(`parameterName`, `key`, `dataType`, `unit`, `defaultValue`). Un parámetro sin fila
en `values` significa **sin valor personalizado**; no se materializa el
predeterminado.

`GET /api/configurations/:configurationId/changes?limit=&offset=`

Cambios registrados en los experimentos del perfil, del más reciente al más
antiguo, con `pathSnapshot` y `appliedToProfile`.

### Experimentos

`GET /api/experiments?versionId=&configurationId=&status=&limit=&offset=`

`status`: `planned | in_progress | completed | failed | inconclusive`.

`GET /api/experiments/:experimentId`

Devuelve `{ "data": { "experiment": { … }, "changes": [ … ] } }`.

`POST /api/experiments`

```json
{
  "configurationId": "uuid",
  "title": "Probar ISO 100 de noche",
  "objective": "opcional",
  "hypothesis": "opcional",
  "status": "in_progress"
}
```

- `title` obligatorio (≤ 120). `status` por defecto `planned`.
- Al crear con estado distinto de `planned` se sella `startedAt`; con un estado
  final (`completed|failed|inconclusive`) también `completedAt`.
- `201` con el experimento creado. El perfil debe ser del usuario (`404` si no).

`POST /api/experiments/:experimentId/changes`

```json
{
  "parameterId": "uuid",
  "newValue": 30,
  "apply": false,
  "reason": "Reducir ruido",
  "observation": "Mejor nitidez"
}
```

- `parameterId` y `newValue` obligatorios; el valor debe coincidir con el tipo del
  parámetro (`integer`, `decimal`, `boolean`, `string`, `enum`, `json`).
- El parámetro debe pertenecer a la **misma versión** que el perfil del experimento.
- `apply` por defecto **`false`**: sin la marca solo se registra historial y el
  perfil no cambia. Con `apply: true` se actualiza el valor del perfil y después se
  registra el cambio (`appliedToProfile: true`).
- El **valor anterior** y la **ruta congelada** (`pathSnapshot`) los calcula el
  servidor; no se aceptan del cliente.
- `201` con el cambio creado.

### Recomendaciones IA

`POST /api/ai/recommendations`

```json
{
  "versionId": "uuid",
  "title": "Probar ISO 50",
  "reasoningSummary": "Menos ruido esperado",
  "suggestedChanges": [{ "parameterId": "uuid", "value": 15 }],
  "configurationId": "uuid opcional",
  "experimentId": "uuid opcional"
}
```

- `title` y `suggestedChanges` (1–20 objetos) obligatorios.
- `configurationId`/`experimentId` deben pertenecer a esa versión (`400` si no).
- Se registra con `status: "proposed"`; **nunca** aplica cambios por sí sola.
- `201` con la recomendación.

## Ejemplos

```bash
TOKEN="<access_token>"

curl -s http://localhost:3000/api/health

curl -s "http://localhost:3000/api/cameras?limit=10" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST "http://localhost:3000/api/experiments" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"configurationId":"<uuid>","title":"Prueba API","status":"in_progress"}'
```

En local con `vercel dev` la base es `http://localhost:3000`; en producción, el
dominio de Vercel. La app SPA y la API comparten proyecto.

## Entorno

La API lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (o sus equivalentes
`SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` en servidores sin frontend). Ambas son
**públicas**; no hay secretos en la API ni en el bundle. El acceso se controla con el
JWT y RLS.

## Decisiones y límites conocidos

- Sin CORS: pensada para clientes servidor-a-servidor (MCP, scripts). Si se llamara
  desde un navegador de otro origen, habría que añadir cabeceras explícitas.
- Sin rate limiting propio: los límites de Vercel y Supabase actúan de tope. Cada
  función es pequeña y paginada.
- Los errores 4xx no se registran en consola; los 5xx sí, sin exponer detalles.
- `parameter_changes` es append-only: no hay forma de editar ni borrar historial por
  la API.
