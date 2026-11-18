import { defineConfig } from 'vitest/config'

// Tests de lógica pura (validadores, helpers, árbol y esquema de respaldos).
// No necesitan DOM ni el plugin de React: se ejecutan en Node.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
  },
})
