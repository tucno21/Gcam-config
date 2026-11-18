import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '../../../components/layout/PageHeader'
import { shortId } from '../../../lib/helpers/shortId'
import { VersionTabs } from './VersionTabs'

type VersionSectionProps = {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}

/** Cabecera + pestañas compartidas por todas las secciones de una versión. */
export const VersionSection = ({ title, description, actions, children }: VersionSectionProps) => {
  const { cameraId, versionId } = useParams()
  const base = `/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}`

  const breadcrumbs = [
    { label: 'Mis cámaras', to: '/cameras' },
    { label: `Cámara · ${shortId(cameraId)}`, to: `/cameras/${cameraId ?? ''}` },
    { label: `Versión · ${shortId(versionId)}`, to: base },
    { label: title },
  ]

  return (
    <>
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} actions={actions} />
      <VersionTabs />
      <div className="mt-6 sm:mt-8">{children}</div>
    </>
  )
}
