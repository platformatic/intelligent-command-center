import React from 'react'
import styles from './CachedEntryDependentsPanelBlock.module.css'
import OriginLine from './OriginLine'
export default function CachedEntryDependentsPanelBlock ({
  dependents = []
}) {
  const httpCacheEntries = {}

  dependents.forEach((entry) => {
    const newValue = { ...entry }
    if (entry.kind === 'HTTP_CACHE') {
      if (httpCacheEntries[entry.origin] === undefined) {
        httpCacheEntries[entry.origin] = []
      }
      httpCacheEntries[entry.origin].push(newValue)
    }
  })

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        Dependant HTTP Cache Entries
      </div>
      <div className={styles.contentWrapper}>
        <div className={`${styles.content}`}>
          <div className={styles.entries}>
            <div className={`${styles.originList}`}>
              {Object.keys(httpCacheEntries).map((origin) => <OriginLine
                key={origin}
                name={origin}
                kind='HTTP_CACHE'
                entries={httpCacheEntries[origin]}
                showCheckbox={false}
                showDetailIcon={false}
                                                             />)}
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
