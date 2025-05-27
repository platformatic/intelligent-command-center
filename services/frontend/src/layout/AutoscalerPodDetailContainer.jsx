import React from 'react'
import { AUTOSCALER_POD_DETAIL_PATH, AUTOSCALER_POD_DETAIL_SERVICES_PATH } from '~/paths'
import styles from './HomeContainer.module.css'
import SideBar from '~/components/ui/SideBar'
import { generatePath, Outlet, useParams } from 'react-router-dom'

function AutoscalerPodDetailContainer () {
  const params = useParams()

  return (
    <div className={styles.content}>
      <SideBar
        topItems={[{
          link: generatePath(AUTOSCALER_POD_DETAIL_PATH, { applicationId: params.applicationId, podId: params.podId }),
          label: 'Overview',
          iconName: 'PodDetailsIcon',
          disabled: false
        }, {
          link: generatePath(AUTOSCALER_POD_DETAIL_SERVICES_PATH, { applicationId: params.applicationId, podId: params.podId }),
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
