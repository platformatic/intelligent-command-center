import React from 'react'
import { PlatformaticIcon } from '@platformatic/ui-components'
import { WHITE, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import styles from './PageSection.module.css'
export default function PageSection ({ title, icon = undefined, buttons = undefined, children }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          {icon && <PlatformaticIcon iconName={icon} color={WHITE} size={MEDIUM} />}
          {title}
        </div>
        {buttons}
      </div>
      {children}
    </div>
  )
}
