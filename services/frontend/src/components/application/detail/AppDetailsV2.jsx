import React, { useEffect, useState } from 'react'
import { useRouteLoaderData } from 'react-router-dom'
import styles from './AppDetails.module.css'
import AppNameBox from './AppNameBox'
import ServicesBox from './ServicesBox'
import DeploymentsBox from './DeploymentsBox'
import NodeJSMetrics from './NodeJSMetrics'
import KubernetesResources from './KubernetesResources'
import AppDetailActivities from './AppDetailActivities'
import useICCStore from '../../../useICCStore'
import ErrorComponent from '~/components/errors/ErrorComponent'
import { PAGE_APPLICATION_DETAILS } from '../../../ui-constants'

export default function AppDetailsV2 () {
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(false)

  const globalState = useICCStore()
  const { setCurrentPage } = globalState
  const { taxonomyId, publicUrl, application } = useRouteLoaderData('appRoot')

  useEffect(() => {
    setCurrentPage(PAGE_APPLICATION_DETAILS)
  }, [])

  if (showErrorComponent) {
    return <ErrorComponent error={error} message={error.message} onClickDismiss={() => setShowErrorComponent(false)} />
  }
  return (
    <div className={styles.container}>
      <div className={styles.containerElement}>
        <div className={styles.content}>
          <AppNameBox
            application={application}
            gridClassName={styles.appNameBox}
            onErrorOccurred={(error) => {
              setError(error)
              setShowErrorComponent(true)
            }}
            applicationPublicUrl={publicUrl}
          />
          <ServicesBox
            taxonomyId={taxonomyId}
            application={application}
            gridClassName={styles.servicesBox}
          />
          <DeploymentsBox
            application={application}
            gridClassName={styles.deploymentsBox}
          />
          <NodeJSMetrics
            taxonomyId={taxonomyId}
            application={application}
            gridClassName={styles.nodeJsMetricsBox}
          />
          <KubernetesResources
            application={application}
            taxonomyId={taxonomyId}
            gridClassName={styles.nodeJsMetricsBox}
          />
          <AppDetailActivities
            application={application}
            taxonomyId={taxonomyId}
            gridClassName={styles.activitiesBox}
          />
        </div>
      </div>
    </div>
  )
}
