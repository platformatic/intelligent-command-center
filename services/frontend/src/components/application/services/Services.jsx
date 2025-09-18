import React from 'react'
import styles from './Services.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import ListView from './ListView'

export default function Services () {
  return (
    <div className={styles.servicesContainer}>
      <div className={styles.content}>
        <div className={`${styles.elementContainer} ${commonStyles.tinyFlexBlock}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.PlatformaticServiceIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Applications</p>
          </div>
          <ListView />
        </div>
      </div>
    </div>
  )
}
