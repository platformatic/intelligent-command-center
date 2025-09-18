import React from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { OPACITY_30 } from '@platformatic/ui-components/src/components/constants'
import { Tag } from '@platformatic/ui-components'
import styles from './Row.module.css'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import gridStyles from '~/styles/GridStyles.module.css'
import { getBackgroundPillsProps } from './activities_utils'

function Row ({
  createdAt = '',
  username = '-',
  applicationName = '-',
  event = ''
}) {
  return (
    <div className={styles.activityRow}>
      <div className={`${styles.tableSmallDescription} ${gridStyles.colSpanMiddle3}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Watt Name</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${styles.customSmallFlexRow}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${applicationName === '-' ? typographyStyles.opacity70 : ''} ${typographyStyles.ellipsis}`}>{applicationName}</span>
          </div>
        </div>
      </div>

      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle3}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Date & Time (GMT)</span>
        </div>
        <div className={styles.tableCell}>
          <div className={styles.customSmallFlexRow}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{getFormattedTimeAndDate(createdAt)}</span>
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle3}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.ellipsis}`}>Activity</span>
        </div>
        <div className={styles.tableCell}>
          <div className={`${styles.customSmallFlexRow}`}>
            {event && <Tag
              text={event.toUpperCase().replaceAll('_', ' ')}
              bordered={false}
              opaque={OPACITY_30}
              fullRounded
              paddingClass={styles.paddingTagEvent}
              {...getBackgroundPillsProps(event.toUpperCase(), typographyStyles)}
                      />}
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmallDescription} ${gridStyles.colSpanMiddle3}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Actor</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${styles.customSmallFlexRow}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${username === '-' ? typographyStyles.opacity70 : ''} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{username}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
export default Row
