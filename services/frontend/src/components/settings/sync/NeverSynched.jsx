import React from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './NeverSynched.module.css'
import {
  BLACK_RUSSIAN,
  TRANSPARENT
} from '@platformatic/ui-components/src/components/constants'

import { BorderedBox } from '@platformatic/ui-components'

function NeverSynched ({
  title = 'No Data Available',
  subTitle = '',
  titleClassName = `${typographyStyles.desktopBody} ${typographyStyles.textWhite}`,
  subTitleClassName = `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
  children = null,
  icon
}) {
  return (

    <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN}>
      <div className={styles.noDataFoundContainer}>
        <div className={`${commonStyles.miniFlexBlock} ${styles.icon}`}>
          <div>{icon}</div>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{title}</span>
        </div>
      </div>
    </BorderedBox>
  )
}

export default NeverSynched
