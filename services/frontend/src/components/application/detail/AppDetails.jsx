import React, { useState } from 'react'
import { useRouteLoaderData } from 'react-router-dom'
import styles from './AppDetails.module.css'
import AppNameBox from './AppNameBox'
import ApplicationsBox from './ApplicationsBox'
import DeploymentsBox from './DeploymentsBox'
import NodeJSMetrics from './NodeJSMetrics'
import KubernetesResources from './KubernetesResources'
import Activities from '~/components/application/activities/Activities'
import VersionBanner from './VersionBanner'

export default function AppDetails () {
  const { publicUrl, application } = useRouteLoaderData('appRoot')
  const [selectedVersion, setSelectedVersion] = useState(null)

  const versionLabel = selectedVersion?.versionLabel ?? null
  const showBanner = selectedVersion && selectedVersion.status !== 'active'

  return (
    <div className={styles.container}>
      <div className={styles.containerElement}>
        <div className={styles.twoColumnsContent}>
          <div className={styles.twoColumnsContentLeft}>
            <AppNameBox
              application={application}
              gridClassName={styles.appNameBox}
              applicationPublicUrl={publicUrl}
            />
            <ApplicationsBox
              application={application}
              gridClassName={styles.servicesBox}
            />
          </div>
          <div className={styles.twoColumnsContentRight}>
            <DeploymentsBox
              application={application}
              gridClassName={styles.deploymentsBox}
              selectedVersion={selectedVersion}
              onVersionSelect={setSelectedVersion}
            />
          </div>
        </div>
        <div className={styles.content}>
          {showBanner && (
            <VersionBanner
              versionLabel={selectedVersion.versionLabel}
              status={selectedVersion.status}
            />
          )}
          <NodeJSMetrics application={application} versionLabel={versionLabel} />
          <KubernetesResources application={application} versionLabel={versionLabel} />
          <Activities compact applicationId={application.id} />
        </div>
      </div>
    </div>
  )
}
