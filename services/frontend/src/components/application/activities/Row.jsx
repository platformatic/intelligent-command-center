import React from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { OPACITY_30 } from '@platformatic/ui-components/src/components/constants'
import { Tag } from '@platformatic/ui-components'
import styles from './Row.module.css'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import { getBackgroundPillsProps } from '~/components/activities/activities_utils'

function Row ({
  createdAt = '',
  description = '-',
  applicationName = '-',
  showWattName = false,
  event = ''
}) {
  const { backgroundClassName, ...pillProps } = getBackgroundPillsProps(event.toUpperCase(), typographyStyles)
  return (
    <tr className={styles.row}>
      {showWattName && (
        <td className={styles.cell}>
          <span className={`${typographyStyles.desktopBodySmall} ${applicationName === '-' ? typographyStyles.opacity70 : ''} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>
            {applicationName}
          </span>
        </td>
      )}
      <td className={styles.cell}>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>
          {getFormattedTimeAndDate(createdAt)}
        </span>
      </td>
      <td className={styles.cell}>
        {event && (
          <Tag
            text={event.toUpperCase().replaceAll('_', ' ')}
            bordered={false}
            opaque={OPACITY_30}
            fullRounded
            paddingClass={`${styles.paddingTagEvent} ${backgroundClassName}`}
            {...pillProps}
          />
        )}
      </td>
      <td className={styles.cell}>
        <span className={`${typographyStyles.desktopBodySmall} ${description === '-' ? typographyStyles.opacity70 : ''} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>
          {description}
        </span>
      </td>
    </tr>
  )
}

export default Row
