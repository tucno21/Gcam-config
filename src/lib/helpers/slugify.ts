/**
 * Convierte un nombre en slug válido según la regla de la base
 * (`^[a-z0-9]+(-[a-z0-9]+)*$`): minúsculas, sin acentos, guiones simples.
 */
export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    // quita diacríticos generados por la descomposición (á → a)
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
