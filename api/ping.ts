/** Diagnóstico temporal: función sin imports ni entorno. */
type MinimalRequest = { method?: string }
type MinimalResponse = {
  status: (code: number) => MinimalResponse
  setHeader: (name: string, value: string) => void
  json: (payload: unknown) => void
}

export default function handler(_request: MinimalRequest, response: MinimalResponse): void {
  response.status(200)
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.json({ data: { ok: true, runtime: process.version } })
}
