import React, { useState } from 'react'
import { useRouteLoaderData, useNavigate, generatePath } from 'react-router-dom'
import { Button } from '@platformatic/ui-components'
import { RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './AppDetails.module.css'
import AppNameBox from './AppNameBox'
import ApplicationsBox from './ApplicationsBox'
import DeploymentsBox from './DeploymentsBox'
import NodeJSMetrics from './NodeJSMetrics'
import KubernetesResources from './KubernetesResources'
import Activities from '~/components/application/activities/Activities'
import NoDataFound from '~/components/ui/NoDataFound'
import VersionBanner from './VersionBanner'

export default function AppDetails () {
  const { publicUrl, application } = useRouteLoaderData('appRoot')
  const navigate = useNavigate()
  const [selectedVersion, setSelectedVersion] = useState(null)

  const versionLabel = selectedVersion?.versionLabel ?? null
  const showBanner = selectedVersion && selectedVersion.status !== 'active'

  if (!application.isDeployed) {
    return (
      <div className={styles.container}>
        <NoDataFound
          fullCentered
          title='This Watt is not deployed yet'
          subTitle={<span>Deploy your Watt to see its metrics, services and activity here.</span>}
        >
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter}`}>
            <Button
              label='Go to Deploy Tokens'
              onClick={() => navigate(generatePath('/watts/:applicationId/settings', { applicationId: application.id }))}
              color={RICH_BLACK}
              backgroundColor={WHITE}
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.smallButtonPadding}
            />
          </div>
        </NoDataFound>
      </div>
    )
  }

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
