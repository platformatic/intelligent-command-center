// Based on @vercel/workflow web package (https://github.com/vercel/workflow)
// Copyright 2025 Vercel Inc. Licensed under Apache License 2.0.
// Modified for Platformatic ICC integration.

import React from 'react'
import { Tag } from '@platformatic/ui-components'
import { ERROR_RED, MAIN_GREEN, OPACITY_30, WARNING_YELLOW, WHITE } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import styles from '../recommendations/StatusPill.module.css'

const STATUS_COLORS = {
  completed: { bg: MAIN_GREEN, textClass: 'textMainGreen' },
  running: { bg: '#3B82F6', textClass: 'textWhite' },
  failed: { bg: ERROR_RED, textClass: 'textErrorRed' },
  cancelled: { bg: WARNING_YELLOW, textClass: 'textWarningYellow' },
  pending: { bg: WHITE, textClass: 'textWhite' },
  expired: { bg: ERROR_RED, textClass: 'textErrorRed' }
}

export default function WorkflowStatusPill ({ status }) {
  const config = STATUS_COLORS[status] || STATUS_COLORS.pending

  return (
    <Tag
      backgroundColor={config.bg}
      text={(status || 'unknown').toUpperCase()}
      color={config.bg}
      bordered={false}
      opaque={OPACITY_30}
      paddingClass={styles.padding}
      fullRounded
      textClassName={`${typographyStyles.desktopOtherOverlineSmallest} ${typographyStyles[config.textClass]}`}
    />
  )
}
