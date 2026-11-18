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

   | Variable | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |

4. **Deploy**. La API se detecta desde `api/` automáticamente.

> La clave `service_role` **no** se configura nunca: ni la app ni la API la usan
> (D-032). Todo se limita con el JWT del usuario y RLS.

## 2. `vercel.json`

- `rewrites`: `/api/*` pasa tal cual a la función y **el resto** cae en
  `index.html` (rutas de la SPA como `/camaras/...` o `/login` sin 404).
- `headers`: `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`,
  `Permissions-Policy` sin cámara/micrófono/geolocalización.
- `Cache-Control` inmutable para `/assets/*` (nombres con hash).

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

- [ ] `/login` carga sin el aviso «Falta configurar Supabase».
- [ ] `/api/health` responde `{ "data": { "status": "ok" } }`.
- [ ] `/api/cameras` sin token responde `401 unauthorized`.
- [ ] Login real con tu usuario y CRUD de una cámara en producción.
- [ ] Recarga directa de una ruta profunda (p. ej. `/cameras/.../hierarchy`)
      sirve la SPA, no un 404.
- [ ] Revisión en móvil (misma red) de login, catálogo y estructura.
- [ ] RLS: con otra cuenta (si existe) no se ven datos ajenos.

## 5. Problemas típicos

| Síntoma | Causa | Solución |
|---|---|---|
| «Falta configurar Supabase» | Variables ausentes en Vercel | Añadirlas y **redeploy** |
| `404` en `/login` o rutas internas | Falta el rewrite de la SPA | Revisar `vercel.json` y redesplegar |
| `FUNCTION_INVOCATION_FAILED` en `/api/*` | Funciones ESM con imports sin extensión | `api/package.json` con `"type": "commonjs"` (ya incluido) |
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
