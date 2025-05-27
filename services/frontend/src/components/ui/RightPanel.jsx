import React, { useEffect, useState } from 'react'
import { PlatformaticIcon } from '@platformatic/ui-components'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import styles from './RightPanel.module.css'

const RightPanel = ({
  onClosePanel = () => {},
  children = null
}) => {
  const className = `${styles.containerRight} ${styles.panelRightCover} ${styles.smallLayout}`
  const [modalClassName] = useState(className)
  const [variantModalClassName, setVariantModalClassName] = useState(`${styles.container} ${styles.panelRightCover}`)
  useEffect(() => {
    setVariantModalClassName(`${modalClassName} ${styles.panelRightCoverEntering}`)
  }, [])

  function close () {
    setVariantModalClassName(`${modalClassName} ${styles.panelRightCoverLeaving}`)
    setTimeout(() => {
      onClosePanel()
    }, 300)
  }

  return (
    <div className={variantModalClassName}>
      <div className={styles.modalRight}>
        <div className={styles.headerClassName}>
          <PlatformaticIcon
            internalOverHandling
            iconName='CloseIcon'
            color={WHITE}
            size={MEDIUM}
            onClick={() => close()}
          />
        </div>
        {children}
      </div>
    </div>
  )
}

export default RightPanel
