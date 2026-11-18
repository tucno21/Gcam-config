import type { ApiRequest, ApiResponse } from './_lib/http'

/** Diagnóstico temporal de despliegue: sin dependencias ni entorno. */
export default function handler(_request: ApiRequest, response: ApiResponse): void {
  response.status(200)
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.json({ data: { ok: true, runtime: process.version } })
}
