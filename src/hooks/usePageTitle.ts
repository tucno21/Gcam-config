import { useEffect } from 'react'
import { APP_NAME } from '../lib/constants/app'

/** Mantiene sincronizado el título del documento con la vista actual. */
export const usePageTitle = (title?: string): void => {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
