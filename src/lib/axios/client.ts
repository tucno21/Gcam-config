import axios from 'axios'
import { API_BASE_URL, API_TIMEOUT_MS } from '../config/env'
import { toAppError } from '../errors/AppError'

/**
 * Instancia HTTP única para la API propia (Etapa 11).
 *
 * Los errores se normalizan a `AppError` en el interceptor, así que cualquier
 * llamada que rechace ya trae un mensaje legible. La sesión se adjuntará aquí
 * cuando exista la API, nunca desde las vistas.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toAppError(error)),
)
