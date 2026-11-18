import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Vendor separado para cachear entre despliegues y evitar un único
        // bundle gigante. Las páginas ya se cargan por rutas con lazy().
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          'dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
  },
  server: {
    // Escucha en todas las interfaces para poder entrar desde la red/túnel.
    host: true,
    // Hosts autorizados a entrar al servidor de desarrollo.
    // Vite bloquea por defecto cualquier Host ajeno (protección DNS rebinding).
    allowedHosts: ['reactest.zonadocente.com', '.zonadocente.com'],
  },
  preview: {
    host: true,
    allowedHosts: ['reactest.zonadocente.com', '.zonadocente.com'],
  },
})
