import React, { useEffect, useState } from 'react'
import styles from './SplashScreen.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MAIN_GREEN } from '@platformatic/ui-components/src/components/constants'
export default function SplashScreen ({
  type,
  success = true,
  timeout = 1000

}) {
  const [destroyed, setDestroyed] = useState(false)
  useEffect(() => {
    setTimeout(() => {
      setDestroyed(true)
    }, timeout)
  }, [])

  function renderMessage () {
    return (
      <>
        <p>You successfully {type} this Recommendation.</p>
        <p>We will send you a new recommendation as soon as will become available</p>
      </>
    )
  }
  if (destroyed) {
    return null
  }
  return (
    <div className={styles.container}>
      <div className={styles.blurred}>
        <div className={styles.content}>
          <div className={styles.icon}>{success && <Icons.CircleCheckMarkIcon color={MAIN_GREEN} />}</div>
          <div className={styles.title}>Recommendation Completed</div>
          <div className={styles.message}>{renderMessage()}</div>
        </div>
      </div>

    </div>
  )
}
