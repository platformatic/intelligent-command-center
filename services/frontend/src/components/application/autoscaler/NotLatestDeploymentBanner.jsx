import React from 'react'
import styles from './NotLatestDeploymentBanner.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { Icons } from '@platformatic/ui-components'
import { SMALL, WARNING_YELLOW } from '@platformatic/ui-components/src/components/constants'

export default function NotLatestDeploymentBanner ({ version }) {
  return (
    <div className={styles.banner} role='status'>
      <Icons.AlertIcon size={SMALL} color={WARNING_YELLOW} />
      <p className={`${typographyStyles.desktopBodySmall} ${styles.text}`}>
        The information you're viewing are not from the latest deployment. Version: {version}
      </p>
    </div>
  )
}
