import React, { useEffect, useState } from 'react'
import styles from './SplashScreen.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MAIN_GREEN } from '@platformatic/ui-components/src/components/constants'
export default function SplashScreen ({
  success = true,
  timeout = 1000,
  message = '',
  title = 'Operation completed',
  onDestroyed = () => {}
}) {
  const [destroyed, setDestroyed] = useState(false)
  useEffect(() => {
    if (destroyed) {
      onDestroyed()
    }
  }, [destroyed])
  useEffect(() => {
    setTimeout(() => {
      setDestroyed(true)
    }, timeout)
  }, [])

  if (destroyed) {
    return null
  }
  return (
    <div className={styles.container}>
      <div className={styles.blurred}>
        <div className={styles.content}>
          <div className={styles.icon}>{success && <Icons.CircleCheckMarkIcon color={MAIN_GREEN} />}</div>
          <div className={styles.title}>{title}</div>
          <div className={styles.message}>{message}</div>
        </div>
      </div>

    </div>
  )
}
