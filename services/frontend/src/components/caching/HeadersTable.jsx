import React from 'react'
import styles from './HeadersTable.module.css'
export default function HeadersTable ({ headers }) {
  return (
    <div className={styles.table}>
      {Object.keys(headers).map((k) => {
        return (
          <div className={styles.line} key={k}>
            <div className={styles.key}>{k}:</div>
            <div className={styles.separator} />
            <div className={styles.value}>{headers[k]}</div>
          </div>
        )
      })}
    </div>
  )
}
