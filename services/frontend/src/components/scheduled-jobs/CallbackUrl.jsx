import React from 'react'
import styles from './CallbackUrl.module.css'

export default function CallbackUrl ({ method, url }) {
  return (
    <div className={styles.callbackUrl}>
      <span className={styles.method}>{method}</span>
      <span className={styles.url}>{url}</span>
    </div>
  )
}
