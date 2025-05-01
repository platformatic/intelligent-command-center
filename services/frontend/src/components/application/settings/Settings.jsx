import React from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './Settings.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import {
  MEDIUM,
  WHITE
} from '@platformatic/ui-components/src/components/constants'

import Resources from './Resources'
import { useRouteLoaderData } from 'react-router-dom'

export default function Settings () {
  const { application } = useRouteLoaderData('appRoot')

  return (
    <div className={styles.applicationSettingsContainer}>
      <div className={styles.applicationSettingsContent}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          <Icons.AppSettingsIcon color={WHITE} size={MEDIUM} />
          <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Settings</p>
        </div>
        <Resources
          applicationId={application.id}
        />
      </div>
    </div>
  )
}
