import React, { useState } from 'react'
import styles from './ResponsePanel.module.css'
import { Button, ButtonOnlyIcon } from '@platformatic/ui-components'
import { WHITE, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'

export default function ResponsePanel ({ title, children, downloadable, onClipboardClick = () => {}, onDownload = () => {} }) {
  const [copied, setCopied] = useState(false)
  function handleClipboardClick () {
    onClipboardClick()
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 1000)
  }
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
        <div className={styles.copyToClipBoard} onClick={handleClipboardClick}>
          {copied && <span className={styles.copied}>Copied!</span>}
          <ButtonOnlyIcon platformaticIcon={{ iconName: 'CopyPasteIcon', color: WHITE }} color={WHITE} size='small' />

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
