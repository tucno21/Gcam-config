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
| 13 | Import / export | ✅ | round-trip JSON sin perder relaciones |
| 14 | Calidad y seguridad | ✅ | pruebas funcionales, de seguridad y responsive ejecutadas |
| 15 | Despliegue en Vercel | ✅ | SPA rewrites, RLS verificado en producción, móvil OK |

## Pendientes de decisión del usuario

- **Runner de tests**: resuelto en la Etapa 14 con **Vitest** (autorizado). `npm test`
  cubre lógica pura; no hay pruebas de componentes/DOM.
- **Backend de la API** (Etapa 11): resuelto con **Vercel Functions** (`api/`).
- **SDK de MCP** (Etapa 12): resuelto con `@modelcontextprotocol/sdk` + `zod`, servidor
  MCP local por stdio.
- **Vite 7**: los avisos *high* de `npm audit` son del servidor de desarrollo de Vite 6
  y exigen salto de major. Riesgo aceptado y documentado (D-035); revisar en la
  siguiente actualización planificada.

## Riesgos conocidos

- React 19 + `@dnd-kit`: posibles advertencias de peer dependencies al instalar
  (no se cambiarán versiones para forzarlo).
- Tailwind v4 (CSS-first): no hay `tailwind.config.js`; el tema se define con
  `@theme`.
- TypeScript 7.0.2 con `erasableSyntaxOnly`: prohibido `enum`.
- Planes gratuitos (Supabase/Vercel): límites y pausa por inactividad; no prometer
  servicio gratuito ilimitado.
