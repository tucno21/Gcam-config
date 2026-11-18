/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del proyecto de Supabase, p. ej. `https://xxxx.supabase.co`. */
  readonly VITE_SUPABASE_URL?: string
  /** Clave pública nueva (`sb_publishable_…`). Nunca la `service_role`. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Nombre heredado de la clave pública (`anon`). Se acepta como respaldo. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Base de la API propia (Etapa 11). */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
