import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import styles from './RightPanelPreviewApplicationServices.module.css'

const RightPanelPreviewApplicationServices = ({
  children = null
}) => {
  const className = `${styles.containerRight} ${styles.panelRightCover} ${styles.smallLayout}`
  const [modalClassName] = useState(className)
  const [variantModalClassName, setVariantModalClassName] = useState(`${styles.container} ${styles.panelRightCover}`)
  useEffect(() => {
    setVariantModalClassName(`${modalClassName} ${styles.panelRightCoverEntering}`)
  }, [])

  return (
    <div className={variantModalClassName}>
      <div className={styles.modalRight}>
        {children}
      </div>
    </div>
  )
}

RightPanelPreviewApplicationServices.propTypes = {
  /**
   * children
   */
  children: PropTypes.node
}

export default RightPanelPreviewApplicationServices
