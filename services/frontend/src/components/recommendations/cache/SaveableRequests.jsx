import React, { useEffect, useState } from 'react'
import styles from './SaveableRequests.module.css'
export default function SaveableRequests ({ /* type Route[] */ routes }) {
  /**
   * @typedef Route
   * @type {object}
   * @property {string} name
   * @property {string} serviceName
   * @property {number} ttl
   * @property {number} hits
   * @property {number} misses
   * @property {boolean} recommended
   * @property {boolean} selected
   */

  const [totalRequests, setTotalRequests] = useState(0)
  const [saveableRequests, setSaveableRequests] = useState(0)
  const [savedRequests, setSavedRequests] = useState(0)
  useEffect(() => {
    setTotalRequests(routes.reduce((acc, route) => acc + route.hits + route.misses, 0))
    setSaveableRequests(routes.reduce((acc, route) => acc + (!route.selected ? route.hits + route.misses : 0), 0))
    setSavedRequests(routes.reduce((acc, route) => acc + (route.selected ? route.hits : 0), 0))
  }, [routes])

  return (
    <div className={styles.container}>
      <RequestBar
        type='saved'
        value={savedRequests}
        label='Requests Saved'
        width={savedRequests / totalRequests * 100}
      />

      <Separator />

      <RequestBar
        type='willBeSaved'
        value={saveableRequests}
        label='Will Be Saved'
        width={saveableRequests / totalRequests * 100}
        leftValue={totalRequests}
        leftLabel='Total Requests'
      />

      <Separator />

      <RequestBar type='other' width={saveableRequests / totalRequests * 100} />

      <Separator />

      <RequestBar
        type='saveable'
        value={saveableRequests}
        label='Saveable Requests'
        width={saveableRequests / totalRequests * 100}
        leftValue={totalRequests}
        leftLabel='Total Requests'
      />

    </div>
  )
}

function RequestBar ({ type, value, label, width, leftValue, leftLabel }) {
  return (
    <div className={styles.barContainer} style={{ width: '25%' }}>
      <div className={styles.labelContainer}>
        {leftValue && (
          <div className={styles.leftLabelContainer}>
            <div className={styles.value}>{leftValue}</div>
            <div className={styles.label}>{leftLabel}</div>
          </div>
        )}
        <div className={styles.rightLabelContainer}>
          <div className={styles.value}>{value}</div>
          <div className={styles.label}>{label}</div>
        </div>
      </div>

      <div className={`${styles.bar} ${styles[type]}`} />
    </div>
  )
}

function Separator () {
  return (
    <div className={styles.separator} />
  )
}
