import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './Table.module.css'
import { LoadingSpinnerV2, BorderedBox } from '@platformatic/ui-components'
import Row from './Row'
import gridStyles from '~/styles/GridStyles.module.css'
import { TRANSPARENT, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'

function ToBeImported ({
  loaded = false,
  data = []
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
              text: 'Loading exports...'
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

    if (showNoResult) { return null }

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
          </div>
          <div className={styles.table}>

            {data.map((row, index) => (
              <Row
                key={index} {...row} showStatus={false} showDetail={false}
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

export default ToBeImported
