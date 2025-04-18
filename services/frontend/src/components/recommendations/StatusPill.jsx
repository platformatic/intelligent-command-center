import { Tag } from '@platformatic/ui-components'
import styles from './StatusPill.module.css'
import { ELECTRIC_PURPLE, ERROR_RED, MAIN_GREEN, OPACITY_30, TERTIARY_BLUE, WARNING_YELLOW, WHITE, FLUORESCENT_CYAN } from '@platformatic/ui-components/src/components/constants'
import React from 'react'

export default function StatusPill ({
  status
}) {
  function renderStatusPill (status) {
    let backgroundColor = MAIN_GREEN
    let text = status
    switch (status) {
      case 'calculating':
        backgroundColor = FLUORESCENT_CYAN
        break
      case 'new':
        backgroundColor = ELECTRIC_PURPLE
        break
      case 'expired':
        backgroundColor = WARNING_YELLOW
        break

      case 'aborted':
        backgroundColor = ERROR_RED
        break

      case 'skipped':
        backgroundColor = WHITE
        break
      case 'in_progress':
        text = 'in progress'
        backgroundColor = TERTIARY_BLUE
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
      />
    )
  }
  return renderStatusPill(status)
}
