import React from 'react'
import styles from './CachedEntryPanelBlock.module.css'
import IconCopy from './IconCopy'
import { TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import { Button } from '@platformatic/ui-components'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
export default function CachedEntryPanelBlock ({
  title,
  children,
  downloadable,
  onClipboardClick = () => {},
  onDownload = () => {}
}) {
  function renderIcon () {
    if (downloadable) {
      return (
        <Button
          platformaticIcon={{ iconName: 'DownloadIcon', color: WHITE }}
          type='button'
          label='Download File'
          onClick={onDownload}
          color={WHITE}
          backgroundColor={TRANSPARENT}
          textClass={typographyStyles.desktopButtonSmall}
          paddingClass={commonStyles.smallButtonPadding}
        />

      )
    } else {
      return (
        <div className={styles.copyToClipBoard} onClick={onClipboardClick}>
          <IconCopy />
        </div>
      )
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <span className={`${typographyStyles.desktopBodySemibold}`}> {title}</span>
        {renderIcon()}

      </div>
      <div className={styles.contentWrapper}>
        <div className={`${styles.content}`}>
          {children}
        </div>

      </div>

    </div>
  )
}
