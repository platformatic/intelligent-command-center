import React from 'react'
import { useRouteLoaderData } from 'react-router-dom'
import styles from './AppDetails.module.css'
import AppNameBox from './AppNameBox'
import ServicesBox from './ServicesBox'
import DeploymentsBox from './DeploymentsBox'
import NodeJSMetrics from './NodeJSMetrics'
import KubernetesResources from './KubernetesResources'
import AppDetailActivities from './AppDetailActivities'

export default function AppDetailsV2 () {
  const { publicUrl, application } = useRouteLoaderData('appRoot')

  return (
    <div className={styles.container}>
      <div className={styles.containerElement}>
        <div className={styles.content}>
          <AppNameBox
            application={application}
            gridClassName={styles.appNameBox}
            applicationPublicUrl={publicUrl}
          />
          <ServicesBox
            application={application}
            gridClassName={styles.servicesBox}
          />
          <DeploymentsBox
            application={application}
            gridClassName={styles.deploymentsBox}
          />
          <NodeJSMetrics
            application={application}
            gridClassName={styles.nodeJsMetricsBox}
          />
          <KubernetesResources
            application={application}
            gridClassName={styles.nodeJsMetricsBox}
          />
          <AppDetailActivities
            application={application}
            gridClassName={styles.activitiesBox}
          />
        </div>
      </div>
    </div>
  )
}
