import React from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './SuccessComponent.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { LARGE, MAIN_GREEN } from '@platformatic/ui-components/src/components/constants'

function SuccessComponent ({
  title = '',
  subtitle = ''
}) {
  return (
    <div className={styles.container}>
      <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
        <Icons.CircleCheckMarkIcon size={LARGE} color={MAIN_GREEN} />
        <div className={`${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
          <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${typographyStyles.textCenter} ${commonStyles.fullWidth}`}>
            {title}
          </p>
          <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${typographyStyles.textCenter} ${commonStyles.fullWidth}`}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  )
}

export default SuccessComponent
