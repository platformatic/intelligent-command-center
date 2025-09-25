import React, { useEffect, useState } from 'react'
import styles from './Autoscaler.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import Pods from '~/components/pods/Pods'
import { TabbedWindow } from '@platformatic/ui-components'
import ScalerEvents from './ScalerEvents'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import ExperimentalTag from '@platformatic/ui-components/src/components/ExperimentalTag'

export default function Autoscaler () {
  const { application } = useRouteLoaderData('appRoot')
  const [keyTabSelected, setKeyTabSelected] = useState('pods')

  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab')
  function handleTabChange (tab) {
    // TODO: setting the tab is useful to permalink some inner section of the page.
    // But it's not working as expected.
    // It's not working because the tabbed window is not a react-router component.
    // That makes some visual glitches when the tab is changed.
    // So we need to use a different approach to handle the tab change.
    // For now, we'll just use the keyTabSelected state to handle the tab change.
    // setSearchParams({ tab })
    setKeyTabSelected(tab)
  }
  useEffect(() => {
    if (tab) {
      setKeyTabSelected(tab)
    }
  }, [])
  return (
    <div className={styles.autoscalerContainer}>
      <div className={styles.autoscalerContent}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.HorizontalPodAutoscalerIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Autoscaler</p>
            <ExperimentalTag />
          </div>
        </div>

        <TabbedWindow
          key={keyTabSelected}
          tabs={[
            {
              label: 'Pods',
              key: 'pods',
              component: () => <Pods applicationId={application?.id} />
            }, {
              label: 'Scaling History',
              key: 'scaling_history',
              component: () =>
                <ScalerEvents
                  applicationId={application?.id}
                  deploymentId={application?.latestDeployment.id}
                  limit={100}
                />
            }
          ]}
          keySelected={keyTabSelected}
          callbackSelected={handleTabChange}
          tabContainerClassName={styles.autoscalerTabContainer}
          tabContentClassName={styles.autoscalerTabContent}
          textClassName={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${styles.customTab}`}
        />
      </div>
    </div>
  )
}
