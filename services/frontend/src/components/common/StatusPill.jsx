import { Tag } from '@platformatic/ui-components'
import typographyStyles from '~/styles/Typography.module.css'
import styles from '../recommendations/StatusPill.module.css'
import { MAIN_GREEN, OPACITY_30 } from '@platformatic/ui-components/src/components/constants'
import React from 'react'

export default function StatusPill ({
  status,
  backgroundColor = MAIN_GREEN

}) {
  function getTextClass (color) {
    return color.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  }
  function renderStatusPill (status) {
    const textClass = getTextClass(backgroundColor)
    return (
      <Tag
        backgroundColor={backgroundColor}
        text={status.toUpperCase()}
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
