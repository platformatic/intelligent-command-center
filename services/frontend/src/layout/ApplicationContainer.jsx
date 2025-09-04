import React from 'react'

import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './HomeContainer.module.css'
import SideBar from '~/components/ui/SideBar'
import { Outlet, useLoaderData, useNavigation, generatePath } from 'react-router-dom'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'

function ApplicationContainer ({ children }) {
  const { application } = useLoaderData()
  const navigation = useNavigation()

  if (navigation.state === 'loading') {
    return (
      <LoadingSpinnerV2
        loading
        applySentences={{
          containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
          sentences: [{
            style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
            text: 'Loading your application...'
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
            label: 'All Applications',
            iconName: 'AllAppsIcon',
            disabled: (application?.deploymentsOnMainTaxonomy ?? 0) === 0
          },
          {
            separator: true
          },
          {
            link: generatePath('', { applicationId: application.id }),
            label: 'App Details',
            iconName: 'AppDetailsIcon',
            disabled: (application?.deploymentsOnMainTaxonomy ?? 0) === 0
          },
          {
            link: generatePath('services', { applicationId: application.id }),
            label: 'Services',
            iconName: 'PlatformaticServiceIcon',
            disabled: (application?.deploymentsOnMainTaxonomy ?? 0) === 0
          },
          {
            link: generatePath('deployment-history', { applicationId: application.id }),
            label: 'Deployment History',
            iconName: 'DeploymentHistoryIcon',
            disabled: (application?.deploymentsOnMainTaxonomy ?? 0) === 0
          },
          {
            link: generatePath('autoscaler', { applicationId: application.id }),
            label: 'Autoscaler',
            iconName: 'HorizontalPodAutoscalerIcon',
            disabled: (application?.deploymentsOnMainTaxonomy ?? 0) === 0
          }, {
            link: generatePath('flamegraphs', { applicationId: application.id }),
            label: 'Flamegraphs',
            iconName: 'FlamegraphsIcon',
            disabled: (application?.deploymentsOnMainTaxonomy ?? 0) === 0
          }, {
            link: generatePath('activities', { applicationId: application.id }),
            label: 'Activities',
            iconName: 'CheckListIcon',
            disabled: (application?.deploymentsOnMainTaxonomy ?? 0) === 0
          }, {
            link: generatePath('scheduled-jobs', { applicationId: application.id }),
            label: 'Scheduled Jobs',
            iconName: 'ScheduledJobsIcon',
            disabled: (application?.deploymentsOnMainTaxonomy ?? 0) === 0
          }]}
        bottomItems={[{
          link: generatePath('settings', { applicationId: application.id }),
          label: 'Settings',
          iconName: 'AppSettingsIcon',
          disabled: (application?.deploymentsOnMainTaxonomy ?? 0) === 0
        }]}
      />
      <Outlet />
    </div>
  )
}

export default ApplicationContainer
