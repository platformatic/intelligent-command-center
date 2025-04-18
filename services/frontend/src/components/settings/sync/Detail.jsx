import React, { useState } from 'react'

import { WHITE, BLACK_RUSSIAN, TRANSPARENT, MEDIUM, SMALL, OPACITY_15, ACTIVE_AND_INACTIVE_STATUS } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './Detail.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { Tag, Button, BorderedBox } from '@platformatic/ui-components'
import { getBackgroundPillsProps, convertBytesToKbs } from './sync_utils'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import SyncLogs from './SyncLogs'
import { downloadSynchZip } from '~/api'

function ExportDetail ({ title, data }) {
  const [logsCopied, setLogsCopied] = useState(false)

  const { synchedAt, status, hmac, fileSize = 0, fileName, logs = [] } = data
  const size = convertBytesToKbs(fileSize)

  function copyLogs () {
    setLogsCopied(true)
    const logs = data.logs.map(log => `${getFormattedTimeAndDate(log.date)} [${log.level?.toUpperCase()}] ${log.msg}`).join('\n')
    navigator.clipboard.writeText(logs)
    setTimeout(() => {
      setLogsCopied(false)
    }, 1000)
  }

  async function downloadFile () {
    const response = await downloadSynchZip(fileName)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      fileName
    )
    document.body.appendChild(link)
    link.click()
    link.parentNode.removeChild(link)
  }

  function getButtonCopyIcon () {
    if (logsCopied) {
      return { iconName: 'CircleCheckMarkIcon', size: SMALL, color: WHITE }
    }
    return { iconName: 'CLIIcon', size: SMALL, color: WHITE }
  }
  return (

    <>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${styles.header}`}>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} `}>
          <div className={` ${commonStyles.fullWidth} ${styles.firstLine}`}>
            <div className={`${commonStyles.tinyFlexRow}  ${commonStyles.itemsCenter}`}>
              <Icons.ComputerOutIcon color={WHITE} size={MEDIUM} />
              <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>{title}</p>
            </div>
            <div>
              {status && <Tag
                text={status.toUpperCase()}
                bordered={false}
                opaque={OPACITY_15}
                fullRounded
                paddingClass={styles.paddingTag}
                {...getBackgroundPillsProps(status.toUpperCase(), typographyStyles)}
                         />}
            </div>
          </div>
        </div>

        <div className={`${commonStyles.smallFlexRow} ${styles.target} `}>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>HMAC-SHA256:</span>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{hmac}</span>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${styles.pipe}`}> | </span>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>Exported on (UTC):</span>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{getFormattedTimeAndDate(synchedAt)}</span>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${styles.pipe}`}> | </span>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>Package Size (KB):</span>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{size}</span>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${styles.pipe}`}> | </span>

          <Button
            platformaticIconAfter={{ iconName: 'DownloadIcon', color: WHITE }}
            type='button'
            label='Download'
            onClick={() => downloadFile(fileName)}
            color={WHITE}
            backgroundColor={TRANSPARENT}
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={styles.buttonPadding}
            bordered={false}
            disabled={!fileName}
          />

        </div>
      </div>

      <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxSynch}>
        <div className={styles.container}>

          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyEnd}`}>
            <Button
              label='Copy Logs'
              type='button'
              color={WHITE}
              backgroundColor={TRANSPARENT}
              hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
              paddingClass={commonStyles.smallButtonPadding}
              textClass={typographyStyles.desktopButtonSmall}
              onClick={() => copyLogs()}
              platformaticIcon={getButtonCopyIcon()}
              bordered={false}
            />
          </div>

          <SyncLogs logs={logs} status={status} />
        </div>

      </BorderedBox>
    </>

  )
}

export default ExportDetail
