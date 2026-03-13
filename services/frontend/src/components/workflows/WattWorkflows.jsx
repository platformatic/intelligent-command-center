import React from 'react'
import { useRouteLoaderData } from 'react-router-dom'
import Workflows from './Workflows'

export default function WattWorkflows () {
  const { application } = useRouteLoaderData('appRoot')
  return <Workflows appId={application?.name} applicationId={application?.id} />
}
