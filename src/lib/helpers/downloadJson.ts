/** Descarga un objeto como archivo JSON desde el navegador. */
export const downloadJson = (filename: string, data: unknown): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Nombre estable para respaldos: gcam-<slug>-<fecha>.json */
export const backupFilename = (slug: string, suffix = ''): string =>
  `gcam-${slug}${suffix}-${new Date().toISOString().slice(0, 10)}.json`
