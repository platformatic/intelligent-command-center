import React from 'react'

import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './HomeContainer.module.css'
import SideBar from '~/components/ui/SideBar'
import { Outlet, useLoaderData, useNavigation, generatePath } from 'react-router-dom'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import useICCStore from '~/useICCStore'

function WattContainer ({ children }) {
  const { application } = useLoaderData()
  const navigation = useNavigation()
  const { config } = useICCStore()
  const isScalerV2 = config['scaler-algorithm-version'] === 'v2'

  if (navigation.state === 'loading') {
    return (
      <LoadingSpinnerV2
        loading
        applySentences={{
          containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
          sentences: [{
            style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
            text: 'Loading your watt...'
          }, {
            style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
            text: 'This process will just take a few seconds.'
          }]
        }}
        containerClassName={styles.loadingSpinner}
        spinnerProps={{ size: 40, thickness: 3 }}
      />
    )
  }

  return (
    <div className={styles.content}>
      <SideBar
        topItems={[
          {
            link: generatePath('/'),
            label: 'All Watts',
            iconName: 'AllAppsIcon',
            // Back-navigation to the list stays enabled even with no deployment.
            disabled: false
          },
          {
            separator: true
          },
          {
            link: generatePath('', { applicationId: application.id }),
            label: 'Watt Details',
            iconName: 'AppDetailsIcon',
            disabled: !application?.isDeployed
          },
          {
            link: generatePath('applications', { applicationId: application.id }),
            label: 'Applications',
            iconName: 'PlatformaticServiceIcon',
            disabled: !application?.isDeployed
          },
          {
            link: generatePath('deployment-history', { applicationId: application.id }),
            label: 'Deployment History',
            iconName: 'DeploymentHistoryIcon',
            disabled: !application?.isDeployed
          },
          ...(config['skew-protection']
            ? [{
                link: generatePath('versions', { applicationId: application.id }),
                label: 'Version Manager',
                iconName: 'VersionManagerIcon',
                disabled: !application?.isDeployed
              }]
            : []),
          {
            link: generatePath(isScalerV2 ? 'autoscaler-v2' : 'autoscaler', { applicationId: application.id }),
            label: 'Autoscaler',
            iconName: 'HorizontalPodAutoscalerIcon',
            disabled: !application?.isDeployed
          }, {
            link: generatePath('flamegraphs', { applicationId: application.id }),
            label: 'Flamegraphs',
            iconName: 'FlamegraphsIcon',
            disabled: !application?.isDeployed
          }, {
            link: generatePath('activities', { applicationId: application.id }),
            label: 'Activities',
            iconName: 'CheckListIcon',
            disabled: !application?.isDeployed
          }, {
            link: generatePath('scheduled-jobs', { applicationId: application.id }),
            label: 'Scheduled Jobs',
            iconName: 'ScheduledJobsIcon',
            disabled: !application?.isDeployed
          },
          ...(config.workflow
            ? [{
                link: generatePath('workflows', { applicationId: application.id }),
                label: 'Workflows',
                iconName: 'WorkflowIcon',
                disabled: !application?.isDeployed
              }]
            : [])]}
        bottomItems={[{
          link: generatePath('settings', { applicationId: application.id }),
          label: 'Settings',
          iconName: 'AppSettingsIcon',
          // Settings stays reachable with no deployment: it hosts the deploy
          // tokens needed to bring the Watt online.
          disabled: false
        }]}
      />
      <Outlet />
    </div>
  )
}

export default WattContainer
