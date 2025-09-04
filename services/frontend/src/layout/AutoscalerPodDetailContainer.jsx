import React from 'react'
import styles from './HomeContainer.module.css'
import SideBar from '~/components/ui/SideBar'
import { generatePath, Outlet, useParams, useLoaderData } from 'react-router-dom'

function AutoscalerPodDetailContainer () {
  const params = useParams()
  const { application } = useLoaderData()
  return (
    <div className={styles.content}>
      <SideBar
        topItems={[
          {
            link: generatePath('/'),
            label: 'All Applications',
            iconName: 'AllAppsIcon'
          },
          {
            separator: true
          },
          {
            link: generatePath('/applications/:applicationId/autoscaler', { applicationId: application.id }),
            label: 'Overview',
            iconName: 'HorizontalPodAutoscalerIcon',
            disabled: false
          },
          // {
          //   link: generatePath('autoscaler', { applicationId: application.id }),
          //   label: 'Autoscaler',
          //   iconName: 'HorizontalPodAutoscalerIcon'
          // },
          {
            separator: true
          },
          {
            link: generatePath('/applications/:applicationId/autoscaler/:podId', { applicationId: application.id, podId: params.podId }),
            label: 'Overview',
            iconName: 'PodDetailsIcon',
            disabled: false
          },
          {
            link: generatePath('/applications/:applicationId/autoscaler/:podId/signals-history', { applicationId: application.id, podId: params.podId }),
            label: 'Signals History',
            iconName: 'PodSignalsIcon',
            disabled: false
          },
          {
            link: generatePath('/applications/:applicationId/autoscaler/:podId/services', { applicationId: application.id, podId: params.podId }),
            label: 'Services',
            iconName: 'PodServicesIcon',
            disabled: false
          }]}
        bottomItems={[{
          link: generatePath('settings', { applicationId: params.applicationId }),
          label: 'Settings',
          iconName: 'AppSettingsIcon',
          disabled: false
        }]}
      />
      <Outlet />
    </div>
  )
}

export default AutoscalerPodDetailContainer
