import { Tag } from '@platformatic/ui-components'
import typographyStyles from '~/styles/Typography.module.css'
import styles from '../recommendations/StatusPill.module.css'
import { ERROR_RED, MAIN_GREEN, OPACITY_30, WARNING_YELLOW } from '@platformatic/ui-components/src/components/constants'
import React from 'react'

export default function StatusPill ({
  status
}) {
  function renderStatusPill (status) {
    let backgroundColor = MAIN_GREEN
    let textClass = 'textMainGreen'
    const text = status
    switch (status) {
      case 'success':
        backgroundColor = MAIN_GREEN
        break
      case 'failed':
        backgroundColor = ERROR_RED
        textClass = 'textErrorRed'
        break
      case 'paused':
        backgroundColor = WARNING_YELLOW
        textClass = 'textWarningYellow'
        break
    }

    return (
      <Tag
        backgroundColor={backgroundColor}
        text={text.toUpperCase()}
        color={backgroundColor}
        bordered={false}
        opaque={OPACITY_30}
        paddingClass={styles.padding}
        fullRounded
        textClassName={`${typographyStyles.desktopOtherOverlineSmallest} ${typographyStyles[textClass]}`}
      />
    )
  }
  return renderStatusPill(status)
}
