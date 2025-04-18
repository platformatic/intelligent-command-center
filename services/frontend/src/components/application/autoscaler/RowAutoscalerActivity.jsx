import React from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import { OPACITY_15 } from '@platformatic/ui-components/src/components/constants'
import { Tag } from '@platformatic/ui-components'
import styles from './RowAutoscalerActivity.module.css'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import gridStyles from '~/styles/GridStyles.module.css'
import { getBackgroundPillsProps } from './autoscaler_utils'

function RowAutoscalerActivity ({
  datetime = '',
  description = '',
  activity = ''
}) {
  return (
    <div className={styles.rowAutoscalerActivity}>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle2}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Date & Time (GMT)</span>
        </div>
        <div className={styles.tableCell}>
          <div className={styles.customSmallFlexRow}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{getFormattedTimeAndDate(datetime)}</span>
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle4}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.ellipsis}`}>Activity</span>
        </div>
        <div className={styles.tableCell}>
          <div className={`${styles.customSmallFlexRow}`}>
            {activity && <Tag
              text={activity.toUpperCase()}
              bordered={false}
              opaque={OPACITY_15}
              fullRounded
              paddingClass={styles.paddingTagEvent}
              {...getBackgroundPillsProps(activity.toUpperCase(), typographyStyles)}
                         />}
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmallDescription} ${gridStyles.colSpanMiddle6}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Description</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${styles.customSmallFlexRow}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{description}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

RowAutoscalerActivity.propTypes = {
  /**
   * datetime
    */
  datetime: PropTypes.string,
  /**
   * description
    */
  description: PropTypes.string,
  /**
   * activity
    */
  activity: PropTypes.string
}

export default RowAutoscalerActivity
