import React from 'react'
import styles from './Service.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { WHITE } from '@platformatic/ui-components/src/components/constants'
export default function Service ({
  name,
  hasChanges,
  isEntrypoint
}) {
  return (
    <div className={`${styles.service} ${hasChanges ? styles.withChanges : ''}`}>
      {isEntrypoint && (
        <Icons.EntrypointIcon color={WHITE} addImportantToColor />
      )}
      {name}
    </div>
  )
}
