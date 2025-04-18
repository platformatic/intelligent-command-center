import React from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { SMALL, WHITE, TRANSPARENT, OPACITY_15, ACTIVE_AND_INACTIVE_STATUS } from '@platformatic/ui-components/src/components/constants'
import { Button, Tag } from '@platformatic/ui-components'
import styles from './Row.module.css'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import gridStyles from '~/styles/GridStyles.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { getBackgroundPillsProps, convertBytesToKbs } from './sync_utils'

function Row ({
  synchedAt = '',
  fileSize = 0,
  status = '',
  onClickViewDetail = () => {},
  isExport = false,
  showStatus = true,
  showDetail = true
}) {
  const dateLabel = isExport ? 'Exported On (UTC)' : 'Imported On (UTC)'
  return (
    <div className={styles.row}>
      <div className={`${styles.tableSmallDescription} ${gridStyles.colSpanMiddle3}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{dateLabel}</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${styles.customSmallFlexRow}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} `}>{getFormattedTimeAndDate(synchedAt)}</span>
          </div>
        </div>
      </div>

      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle3}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.ellipsis}`}>Package Size</span>
        </div>
        <div className={styles.tableCell}>
          <div className={`${styles.customSmallFlexRow}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} `}>{convertBytesToKbs(fileSize)}</span>
          </div>
        </div>
      </div>

      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle3}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.ellipsis}`}>Package Size</span>
        </div>
        {
          showStatus &&
            <div className={styles.tableCell}>
              <div className={`${styles.customSmallFlexRow}`}>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} `}>

                  {status && <Tag
                    text={status.toUpperCase()}
                    bordered={false}
                    opaque={OPACITY_15}
                    fullRounded
                    paddingClass={styles.paddingTagEvent}
                    {...getBackgroundPillsProps(status.toUpperCase(), typographyStyles)}
                             />}
                </span>
              </div>
            </div>
        }
      </div>

      {showDetail &&
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
          <Button
            label='View Details'
            type='button'
            color={WHITE}
            backgroundColor={TRANSPARENT}
            hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
            paddingClass={commonStyles.smallButtonPadding}
            textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
            onClick={onClickViewDetail}
            bordered={false}
            platformaticIconAfter={{ iconName: 'InternalLinkIcon', color: WHITE, size: SMALL }}
          />
        </div>}
    </div>
  )
}

export default Row
