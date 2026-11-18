# Roadmap

Una etapa a la vez. Al cerrar cada una: `npm run build`, `npm run lint`, revisión
manual si hay UI, actualización de docs y registro en Engram. Se pide autorización
antes de la siguiente.

| # | Etapa | Estado | Criterio de aceptación |
|---|---|---|---|
| 0 | Auditoría inicial | ✅ | diagnóstico, plan y riesgos documentados |
| 1 | AGENTS.md y documentación | ✅ | una sesión nueva puede continuar sin contexto previo |
| 2 | Arquitectura frontend | ✅ | rutas y sistema visual funcionan en desktop y móvil, 0 errores de consola, 0 deps no autorizadas |
| 3 | Modelo de datos y RLS | ✅ | migraciones reproducibles + RLS probado anónimo/autenticado |
| 4 | Capa de datos | ✅ | un CRUD funciona extremo a extremo con errores legibles |
| 5 | Catálogo de cámaras | ✅ | CRUD completo con persistencia real |
| 6 | Versiones | ✅ | varias versiones por cámara, árbol y datos aislados |
| 7 | Jerarquía ilimitada | ✅ | 6 niveles, mover ramas, sin ciclos, persiste al recargar |
| 8 | Parámetros | ✅ | tipos correctos, predeterminado ≠ valor de perfil |
| 9 | Configuraciones | ✅ | perfiles independientes y comparación con predeterminados |
| 10 | Experimentos e historial | ✅ | cambios con valor anterior/nuevo, ruta histórica y trazabilidad |
| 11 | API segura | ✅ | acceso autenticado, paginado y acotado; sin secretos |
| 12 | OpenCode / MCP | ✅ | respuestas basadas en datos reales; escritura limitada |
| 13 | Import / export | ⏳ pendiente | round-trip JSON sin perder relaciones |
| 14 | Calidad y seguridad | ⏳ pendiente | pruebas funcionales, de seguridad y responsive ejecutadas |
| 15 | Despliegue en Vercel | ⏳ pendiente | SPA rewrites, RLS verificado en producción, otro dispositivo OK |

## Pendientes de decisión del usuario

- **Runner de tests** (Etapa 14): hoy no existe; cualquier suite automatizada requiere
  autorización para agregar dependencias.
- **Backend de la API** (Etapa 11): Vercel Functions (`api/`) vs. Supabase Edge
  Functions.
- **SDK de MCP** (Etapa 12): probablemente `@modelcontextprotocol/sdk`, no autorizado
  todavía.
- **Code-splitting**: el bundle pasó de 357 kB a 592 kB (174 kB gzip) al entrar
  `supabase-js`. El warning de Vite no bloquea; se propone resolver con lazy-loading
  de rutas en la Etapa 14, salvo decisión contraria.

## Riesgos conocidos

- React 19 + `@dnd-kit`: posibles advertencias de peer dependencies al instalar
  (no se cambiarán versiones para forzarlo).
- Tailwind v4 (CSS-first): no hay `tailwind.config.js`; el tema se define con
  `@theme`.
- TypeScript 7.0.2 con `erasableSyntaxOnly`: prohibido `enum`.
- Planes gratuitos (Supabase/Vercel): límites y pausa por inactividad; no prometer
  servicio gratuito ilimitado.
