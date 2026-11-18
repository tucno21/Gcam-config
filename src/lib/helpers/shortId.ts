/** Abrevia un UUID para mostrarlo en breadcrumbs y cabeceras. */
export const shortId = (id: string | undefined, length = 8): string =>
  id ? id.slice(0, length) : '—'
