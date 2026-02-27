import React from 'react'
import styles from './VersionBanner.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MEDIUM, WARNING_YELLOW } from '@platformatic/ui-components/src/components/constants'

export default function VersionBanner ({ versionLabel, status }) {
  return (
    <div className={styles.banner}>
      <Icons.AlertIcon color={WARNING_YELLOW} size={MEDIUM} />
      <p className={`${typographyStyles.desktopBodySmall} ${styles.text}`}>
        You are viewing metrics for version <strong>{versionLabel}</strong> which is currently <strong>{status}</strong>. These metrics may not reflect the active deployment.
      </p>
    </div>
  )
}
