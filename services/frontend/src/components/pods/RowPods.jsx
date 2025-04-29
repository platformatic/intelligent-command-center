import React, { useEffect, useRef, useState } from 'react'
import styles from './RowPods.module.css'
import Pod from './Pod'
import useICCStore from '~/useICCStore'

function RowPods ({
  groupPods = [],
  howManyRows = 0,
  evenRow = true,
  firstRow = false,
  applicationId,
  fromPreview = false
}) {
  const globalState = useICCStore()
  const { currentWindowWidth } = globalState
  const [className, setClassName] = useState(`${styles.podsRow}`)
  const rowRef = useRef(null)
  const [style, setStyle] = useState({ width: '100%' })

  useEffect(() => {
    if (howManyRows > 1) {
      let className = ''
      if (!evenRow) {
        className = `${styles.elementsOdd} ${styles.customClass} `
      } else {
        className = firstRow ? `${styles.elementsEven} ` : `${styles.elementsEven} ${styles.customClass} `
      }
      if (howManyRows > 2) {
        className += styles.gap2
      } else {
        className += styles.gap4
      }
      setClassName(className)
    }
  }, [howManyRows, evenRow])

  useEffect(() => {
    if (howManyRows > 1 && currentWindowWidth !== 0 && rowRef?.current && groupPods.length) {
      const singleWidth = rowRef.current.getBoundingClientRect().width / groupPods.length
      if (evenRow) {
        setStyle({
          width: `calc(100% - ${singleWidth / 2}px)`
        })
      } else {
        // padding left second part is caused by borders
        setStyle({
          width: `calc(100% - ${singleWidth / 2}px)`,
          paddingLeft: `calc(${singleWidth / 2}px - ${groupPods.length / 2}px)`
        })
      }
    }
  }, [rowRef?.current, groupPods.length, howManyRows, evenRow, currentWindowWidth])

  return (
    <div className={className} ref={rowRef} style={style}>
      {groupPods.map(pod => (
        <Pod
          key={pod.id}
          {...pod}
          applicationId={applicationId}
          fromPreview={fromPreview}
        />
      ))}
    </div>
  )
}

export default RowPods
