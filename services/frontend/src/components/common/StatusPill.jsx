import { Tag } from '@platformatic/ui-components'
import styles from '../recommendations/StatusPill.module.css'
import { MAIN_GREEN, OPACITY_30 } from '@platformatic/ui-components/src/components/constants'
import React from 'react'

export default function StatusPill ({
  status,
  backgroundColor = MAIN_GREEN

}) {
  function renderStatusPill (status) {
    return (
      <Tag
        backgroundColor={backgroundColor}
        text={status.toUpperCase()}
        color={backgroundColor}
        bordered={false}
        opaque={OPACITY_30}
        paddingClass={styles.padding}
        fullRounded
      />
    )
  }
  return renderStatusPill(status)
}
