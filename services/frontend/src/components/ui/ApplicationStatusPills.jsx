import React from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import { MAIN_GREEN, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import { Icons } from '@platformatic/ui-components'
import { STATUS_STARTED, STATUS_STOPPED, STATUS_RUNNING } from '~/ui-constants'
import styles from './ApplicationStatusPills.module.css'

function ApplicationStatusPills ({ status = STATUS_STOPPED }) {
  if (status === STATUS_STOPPED) {
    return (
      <div className={styles.stoppedPills}>
        <Icons.CircleStopIcon color={WHITE} size={SMALL} />
        <span className={`${typographyStyles.desktopOtherOverlineSmallest} ${typographyStyles.textWhite}`}>{status}</span>
      </div>
    )
  }
  return (
    <div className={styles.runningPills}>
      <div className={styles.clockWiseRotation}>
        <Icons.RunningIcon color={MAIN_GREEN} size={SMALL} />
      </div>
      <span className={`${typographyStyles.desktopOtherOverlineSmallest} ${typographyStyles.textMainGreen}`}>{status === STATUS_STARTED ? STATUS_RUNNING : status}</span>
    </div>
  )
}

ApplicationStatusPills.propTypes = {
  /**
       * status
       */
  status: PropTypes.oneOf([STATUS_STARTED, STATUS_STOPPED])
}

export default ApplicationStatusPills
