import React from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './RowEnvironment.module.css'
import gridStyles from '~/styles/GridStyles.module.css'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import { ERROR_RED, MAIN_GREEN, OPACITY_30 } from '@platformatic/ui-components/src/components/constants'
import { Tag } from '@platformatic/ui-components'

function RowEnvironment ({
  username = '-',
  imported = false,
  createdAt = '',
  success = false
}) {
  return (
    <div className={styles.environmentRow}>
      <div className={`${styles.tableSmallDescription} ${gridStyles.colSpanMiddle4}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Date & Time (GMT)</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${styles.customSmallFlexRow}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>{getFormattedTimeAndDate(createdAt)}</span>
          </div>
        </div>
      </div>

      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle4}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{imported ? 'Imported by' : 'Exported By'}</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${styles.customSmallFlexRow} ${styles.username}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{username || '-'}</span>
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmallDescription} ${gridStyles.colSpanMiddle4}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Status</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${styles.customSmallFlexRow}`}>
            <Tag
              text={success ? 'Success' : 'Failed'}
              textClassName={`${typographyStyles.desktopOtherOverlineSmallest} ${success ? typographyStyles.textMainGreen : typographyStyles.textErrorRed}`}
              backgroundColor={success ? MAIN_GREEN : ERROR_RED}
              bordered={false}
              opaque={OPACITY_30}
              fullRounded
              paddingClass={styles.paddingStatusEvent}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

RowEnvironment.propTypes = {
  /**
   * createdAt
    */
  createdAt: PropTypes.string,
  /**
   * username
    */
  username: PropTypes.string,
  /**
   * success
    */
  success: PropTypes.bool,
  /**
   * imported
    */
  imported: PropTypes.bool
}

export default RowEnvironment
