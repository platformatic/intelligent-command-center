import React from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './SyncLogs.module.css'
import { getFormattedTimeAndDate } from '~/utilities/dates'

function SyncLogs ({ logs = [], status = 'SUCCESS' }) {
  const lastLineColor = status === 'ERROR' ? typographyStyles.textErrorRed : typographyStyles.textMainGreen

  const logLines = logs.map((log, index) => {
    const formattedDate = getFormattedTimeAndDate(log.date)
    if (index === logs.length - 1) {
      return (
        <div key={index} className={`${lastLineColor}`}>
          {formattedDate} [{log.level?.toUpperCase()}] {log.msg}
        </div>
      )
    }
    return (
      <div key={index} className={`${typographyStyles.textWhite}`}>
        <span>{formattedDate}  [{log.level?.toUpperCase()}] {log.msg} </span>
      </div>
    )
  })

  return (
    <div className={`${styles.logs} ${styles.topline} ${typographyStyles.desktopOtherCliTerminalSmall} `}>

      <div className={styles.logsContainer}>
        {logLines}
      </div>
    </div>
  )
}

export default SyncLogs
