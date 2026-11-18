export type ClassValue = string | false | null | undefined

/** Une clases condicionales sin dependencias externas. */
export const cn = (...values: ClassValue[]): string => values.filter(Boolean).join(' ')
