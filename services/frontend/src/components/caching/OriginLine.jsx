import React from 'react'
import styles from './OriginLine.module.css'
import { PlatformaticIcon } from '@platformatic/ui-components'
import { SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import CachedEntry from './CachedEntry'
import InternetIcon from '@platformatic/ui-components/src/components/icons/InternetIcon'
import NextJSIcon from '@platformatic/ui-components/src/components/icons/NextJSIcon'

export default function OriginLine ({
  name,
  entries = [],
  kind = '',
  onCacheEntryChecked = (entry, status) => {},
  onCacheEntrySelected = (entry, status) => {},
  hideChart = () => {},
  showCheckbox = true,
  showDetailIcon = true,
  expanded = false,
  onToggleExpand = () => {},
  checkedEntriesId = []
}) {
  function getEndpoint (entry) {
    if (entry.kind === 'NEXT_CACHE_PAGE') {
      return `GET ${entry.route}`
    }
    return `${entry.method} ${entry.path}`
  }

  function getIcon () {
    switch (kind) {
      case 'HTTP_CACHE':
        return <InternetIcon color='white' />
      case 'NEXT_CACHE_FETCH':
      case 'NEXT_CACHE_PAGE':
        return <NextJSIcon color='white' />
    }
  }

  function renderKind () {
    switch (kind) {
      case 'HTTP_CACHE':
        return ''
      case 'NEXT_CACHE_FETCH':
        return <span className={styles.kind}>(component)</span>
      case 'NEXT_CACHE_PAGE':
        return <span className={styles.kind}>(page)</span>
    }
  }

  return (
    <>
      <div className={styles.line}>
        <div className={styles.name} onClick={onToggleExpand}>
          <div className={styles.from}>
            {getIcon()}
            {name}
            {renderKind()}
          </div>
          <PlatformaticIcon classes={styles.expandIcon} internalOverHandling iconName={!expanded ? 'ArrowRightIcon' : 'ArrowDownIcon'} color={WHITE} size={SMALL} />
        </div>
        {expanded && (
          <div className={styles.endpointContainer}>
            {entries.map((entry) => <CachedEntry
              key={entry.id}
              endpoint={getEndpoint(entry)}
              isChecked={checkedEntriesId.includes(entry.id)}
              metadata={entry.headers}
              onCacheEntryChecked={(checked) => { onCacheEntryChecked(entry, checked) }}
              onCacheEntrySelected={(selected) => { onCacheEntrySelected(entry, selected) }}
              showCheckbox={showCheckbox}
              showDetailIcon={showDetailIcon}
              hideChart={hideChart}
                                    />)}
          </div>

        )}
      </div>

    </>

  )
}
