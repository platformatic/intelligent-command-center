import React, { useState } from 'react'
import styles from './CacheDependencyTree.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Icons, PlatformaticIcon } from '@platformatic/ui-components'
import { SMALL, WARNING_YELLOW, WHITE } from '@platformatic/ui-components/src/components/constants'
import Arrow from './Arrow'
import CachedDependencyTreeChart from './CacheDependencyTreeChart'
import { getCacheDependenciesWarning } from '~/utilities/caching'

export default function CachedDependencyTree ({
  entry = {}
}) {
  const [expanded, setExpanded] = useState(true)
  const { traces = [], dependents = [] } = entry
  const showWarning = getCacheDependenciesWarning(traces, dependents)

  return (
    <div className={styles.dependenciesTreeContainer}>
      <div className={styles.header}>
        <div className={`${typographyStyles.desktopBodySemibold}`}>
          Cache Dependencies Tree
        </div>
        {showWarning &&
          <div className={`${styles.warning} ${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter}`}>
            <Icons.AlertIcon color={WARNING_YELLOW} size={SMALL} />
            <span className={` ${typographyStyles.textWarningYellow} ${typographyStyles.desktopBodySmall}`}>
              Some entry dependents are not shown in the chart below.
            </span>
          </div>}

        <div className={`${styles.collapse}`}>
          <PlatformaticIcon internalOverHandling iconName={!expanded ? 'ArrowRightIcon' : 'ArrowDownIcon'} color={WHITE} size={SMALL} onClick={() => setExpanded(!expanded)} />
        </div>
      </div>

      {expanded &&
        <>
          <div>
            <CachedDependencyTreeChart entry={entry} />
          </div>
          <div className={styles.labels}>
            <div className={styles.label}>
              Entry Dependants
            </div>
            <div className={styles.label}>
              <Arrow color='yellow' />
            </div>
            <div className={styles.label}>
              Selected Entry
            </div>
            <div className={styles.label}>
              <Arrow color='blue' />
            </div>
          </div>
        </>}
    </div>
  )
}
