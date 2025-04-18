import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './Table.module.css'
import { LoadingSpinnerV2, BorderedBox } from '@platformatic/ui-components'
import Row from './Row'
import NeverSynched from './NeverSynched'
import gridStyles from '~/styles/GridStyles.module.css'
import { TRANSPARENT, BLACK_RUSSIAN, WHITE, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'

function Table ({
  loaded = false,
  data = [],
  onViewDetail = () => {},
  isExport = false
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  useEffect(() => {
    if (!loaded) {
      setInnerLoading(true)
    }

    if (loaded) {
      if (data.length === 0) {
        setShowNoResult(true)
      } else {
        setShowNoResult(false)
      }
      setInnerLoading(false)
    }
  }, [loaded, data.length])

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading={innerLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading...'
            }, {
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
              text: 'This process will just take a few seconds.'
            }]
          }}
          containerClassName={styles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    const title = isExport ? 'The data has never beens exported.' : 'The data has never been imported.'
    const icon = isExport ? <Icons.ExportIcon color={WHITE} size={MEDIUM} /> : <Icons.ImportIcon color={WHITE} size={MEDIUM} />

    if (showNoResult) {
      return (
        <NeverSynched
          title={title} icon={icon}
        />
      )
    }

    return (

      <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxSynch}>
        <div className={styles.content}>
          <div className={styles.tableHeaders}>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle3}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Exported On (UTC)</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle3}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Package Size (KB)</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle3}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Status</span>
              </div>
            </div>
          </div>
          <div className={styles.table}>

            {data.map(row => (
              <Row
                key={row.id} {...row} isExport={isExport} onClickViewDetail={() => onViewDetail(row)}
              />
            ))}

          </div>
        </div>
      </BorderedBox>
    )
  }

  return (
    <div className={`${styles.container}`}>
      {renderComponent()}
    </div>
  )
}

export default Table
