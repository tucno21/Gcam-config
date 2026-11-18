# Despliegue en Vercel (Etapa 15)

La SPA (Vite) y la API (`api/`) conviven en el mismo proyecto de Vercel. Este
documento resume el procedimiento y las comprobaciones posteriores.

## 1. Importar el repositorio

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** →
   `tucno21/Gcam-config`.
2. Framework preset: **Vite** (se detecta solo).
   - Build command: `npm run build`
   - Output directory: `dist`
3. **Environment Variables** (Production y Preview):

   | Variable | Valor | Tipo |
   |---|---|---|
   | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | **Config** |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | **Config** |

   ⚠️ Deben ser **Config**, no **Secret**. Vercel no permite marcar como secretas
   las variables con prefijo `VITE_` porque Vite las incrusta en el bundle del
   navegador: son públicas por diseño y su protección real es RLS.

4. **Deploy**. La API se detecta desde `api/` automáticamente.

> Cambiar una variable **exige Redeploy**: con variables de entorno, Vercel no
> reconstruye solo. *Deployments → ⋯ → Redeploy*.

> La clave `service_role` **no** se configura nunca: ni la app ni la API la usan
> (D-032). Todo se limita con el JWT del usuario y RLS.

## 2. `vercel.json`

- `rewrites` (en este orden):
  1. `/api/(.*)` → `/api/[...path]`: envía **todas** las rutas de la API a la
     función única. Sin esta regla, Vercel solo enruta `/api/<un-segmento>` y las
     rutas anidadas (`/api/cameras/:id/versions`) responden el 404 de la
     plataforma.
  2. `"/((?!api/).*)" → /index.html`: el resto cae en la SPA, así `/login` y las
     rutas profundas no dan 404. Un `"/(.*)"` genérico taparía la API.
- `headers`: `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`,
  `Permissions-Policy` sin cámara/micrófono/geolocalización.
- `Cache-Control` inmutable para `/assets/*` (nombres con hash).

La API usa **imports internos con extensión `.js`** (`api/_lib/db.js`): Vercel
ejecuta las funciones como ESM y no resuelve imports relativos sin extensión.

## 3. Supabase Auth con el dominio de producción

En **Authentication → URL Configuration**:

- **Site URL**: `https://gcam-omega.vercel.app`
- **Redirect URLs**: `https://gcam-omega.vercel.app/**` (y
  `http://localhost:5173/**` para desarrollo).

Sin esto, los correos de confirmación/recuperación siguen apuntando a
`localhost:3000` y la sesión no vuelve a la app desde el enlace.

## 4. Comprobaciones tras el deploy

```bash
# Salud pública (sin token)
curl -i https://gcam-omega.vercel.app/api/health

# Sin sesión debe ser 401 (anon no tiene privilegios)
curl -i https://gcam-omega.vercel.app/api/cameras

# La SPA responde en rutas profundas
curl -I https://gcam-omega.vercel.app/login
```

- [x] `/login` carga sin el aviso «Falta configurar Supabase».
- [x] `/api/health` responde `{ "data": { "status": "ok" } }`.
- [x] `/api/cameras` sin token responde `401 unauthorized`.
- [x] Login real con tu usuario y CRUD de una cámara en producción (alta, ficha y
      borrado; base limpia al terminar).
- [x] Recarga directa de una ruta profunda (p. ej. `/cameras/...`) sirve la SPA,
      no un 404.
- [x] Revisión en móvil (390 px) de login y catálogo, sin desbordes.
- [x] RLS: con la clave pública sola (rol `anon`) la lectura da `42501`; la API
      sin cabecera `Authorization` da `401`.

Verificado el 2026-11-18 sobre `https://gcam-omega.vercel.app` con navegador real
(Chrome headless) y sesión del usuario; sin errores de consola.

## 5. Problemas típicos

| Síntoma | Causa | Solución |
|---|---|---|
| «Falta configurar Supabase» | Variables ausentes en Vercel | Añadirlas y **redeploy** |
| Borde rojo al guardar una `VITE_*` | Marcada como **Secret** | Cambiarla a **Config** |
| `404` en `/login` o rutas internas | Falta el rewrite de la SPA | Revisar `vercel.json` y redesplegar |
| `/api/*` devuelve `index.html` | El rewrite SPA captura `/api` | Usar el *negative lookahead* `/((?!api/).*)` |
| Rutas anidadas de `/api` dan 404 de Vercel | El catch-all solo se aplica a un segmento | Rewrite `/api/(.*)` → `/api/[...path]` (ya incluido) |
| `FUNCTION_INVOCATION_FAILED` en `/api/*` | Imports sin extensión en runtime ESM | Imports internos de `api/` con `.js` (ya aplicado) |
| `PGRST205` | Esquema no aplicado en el proyecto | `docs/SETUP-SUPABASE.md` |
| Sin filas con sesión | RLS/`owner_id` | Comprobar que la cámara es de tu usuario |
| Correo apunta a `localhost:3000` | Site URL por defecto | Configurar la URL de producción |

## 6. Notas del plan gratuito

- Vercel **Hobby**: uso personal/no comercial, sin cobros por exceso (limita).
- Supabase **Free**: 2 proyectos, 500 MB; el proyecto se **pausa** tras ~1 semana
  sin actividad (se reactiva desde el panel).
- Las funciones se mantienen pequeñas y paginadas; no hay cron, almacenamiento ni
  servicios extra.

## 7. API y MCP en producción

La API queda en `https://gcam-omega.vercel.app/api` (contrato en `docs/API.md`).
Para el MCP (local):

```bash
npm run mcp:build
GCAM_API_URL="https://gcam-omega.vercel.app/api" \
GCAM_API_TOKEN="<access_token>" \
npm run mcp
```
