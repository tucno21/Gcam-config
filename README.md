# Laboratorio de Configuraciones GCam

Aplicación web privada para documentar cámaras GCam (LMC, AGC, BSG y otras), sus
versiones, el árbol jerárquico de parámetros, los perfiles de configuración y los
experimentos realizados.

Es un **catálogo y laboratorio de documentación**. No modifica la app GCam del
teléfono y **no almacena fotos ni videos**.

## Estado

En construcción por etapas. Ver [`docs/ROADMAP.md`](docs/ROADMAP.md).

- Etapa 0 — auditoría: completa
- Etapa 1 — documentación base: completa
- Etapa 2 — estructura, rutas y sistema visual: completa
- Etapa 3 — modelo de datos y RLS: completa (verificada en PostgreSQL 18)
- Etapa 4 — conexión y capa de datos: completa. Servicios, errores legibles, sesión
  y listado real de cámaras; CRUD de extremo a extremo verificado en el proyecto
  alojado con el usuario real (19 comprobaciones)
- Etapa 5 — catálogo de cámaras: completa. CRUD completo desde la interfaz con
  búsqueda, filtros, archivado y ficha de detalle; verificado con E2E en navegador
- Etapas 5–15: pendientes

La navegación, el layout responsive y los componentes base funcionan. La app exige
sesión (`/login`), lee de Supabase mediante `src/services/` y `Mis cámaras` ya muestra
datos reales con estados de carga, vacío y error. El resto de vistas siguen siendo
marcadores de su etapa. El esquema de la base está versionado en `supabase/`; hasta
aplicarlo, las consultas fallan con un error legible que invita a aplicar migraciones.

## Requisitos

- Node.js **≥ 20** (probado con 20.18.0)
- npm 10+

## Instalación y ejecución local

```bash
npm install
npm run dev
```

La app queda en `http://localhost:5173`.

## Configuración

1. Copia `.env.example` a `.env.local`.
2. Rellena los valores de tu proyecto de Supabase: URL y clave **pública**
   (`sb_publishable_…`, o `anon` en proyectos antiguos).
3. Aplica las migraciones de `supabase/migrations/` (ver
   [`docs/SETUP-SUPABASE.md`](docs/SETUP-SUPABASE.md), incluido el camino sin CLI).
4. Crea tu usuario en **Authentication → Users** (con *Auto Confirm User*) o regístrate
   desde `/login` y confirma el correo.

```bash
cp .env.example .env.local
```

> Nunca uses `service_role` ni claves privilegiadas en el frontend. Todo lo que
> empiece por `VITE_` termina en el bundle del navegador.

`.env.local` está ignorado por git. No subas credenciales al repositorio.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo con HMR |
| `npm run build` | chequeo de tipos (`tsc -b`) + build de producción |
| `npm run lint` | oxlint |
| `npm run preview` | sirve el build local |

No hay script de tests todavía.

## Estructura

```text
src/
  app/          # router y providers
  components/   # UI reutilizable (common, layout, feedback, forms, tree)
  features/     # módulos por dominio
  hooks/        # hooks compartidos
  lib/          # supabase, axios, constants, helpers, validation
  services/     # acceso a datos por dominio
  stores/       # Zustand (solo estado de interfaz)
  styles/       # tokens y estilos globales
  pages/        # páginas por ruta
supabase/       # migraciones, semilla ficticia y pruebas de RLS
docs/           # arquitectura, modelo de datos, roadmap y decisiones
```

## Documentación

- [`AGENTS.md`](AGENTS.md) — reglas permanentes para agentes que trabajen en el repo.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — capas y flujo de datos.
- [`docs/DATABASE.md`](docs/DATABASE.md) — modelo relacional, triggers y RLS.
- [`docs/SETUP-SUPABASE.md`](docs/SETUP-SUPABASE.md) — aplicar migraciones y verificar RLS.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — etapas y estado.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — decisiones técnicas.
- [`tarea_gcam.md`](tarea_gcam.md) — alcance funcional completo.

## Stack

React 19 + TypeScript + Vite 6 + Tailwind CSS 4, con Supabase (base de datos y auth)
y despliegue en Vercel. Detalle y dependencias autorizadas en `AGENTS.md`.
