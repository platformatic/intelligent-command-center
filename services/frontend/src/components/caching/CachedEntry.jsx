import React, { useEffect, useState } from 'react'
import styles from './CachedEntry.module.css'
import { SMALL, WHITE, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import { Checkbox, Icons } from '@platformatic/ui-components'

export default function CachedEntry ({
  endpoint,
  metadata,
  isSelected = false,
  isChecked = false,
  onCacheEntryChecked = (checked) => {},
  onCacheEntrySelected = (selected) => {},
  showCheckbox = true,
  showDetailIcon = true,
  hideChart = () => {}
}) {
  const [checked, setChecked] = useState(false)
  const [selected, setSelected] = useState(false)
  useEffect(() => {
    setChecked(isChecked)
    setSelected(isSelected)
  }, [])
  function onCheck (evt) {
    setChecked(!checked)
    onCacheEntryChecked(!checked)
  }
  function onSelect () {
    onCacheEntrySelected(!selected)
    hideChart()
  }
  return (
    <div className={`${styles.container} ${selected ? styles.selected : ''}`}>
      {showCheckbox && (
        <div className={styles.checkBox}>
          <Checkbox onChange={onCheck} color={WHITE} checked={checked} size={SMALL} />
        </div>)}
      <div className={styles.endpointData} onClick={onSelect}>
        <div>{endpoint}</div>
        <div className={styles.metadata}>{JSON.stringify(metadata, null, 4)}</div>
      </div>
      {showDetailIcon && (
        <div
          className={styles.cachingStatsCollapse} onClick={onSelect}
        >
          <Icons.InternalLinkIcon
            color={WHITE} size={MEDIUM}
          />
        </div>
      )}
    </div>
  )
}
