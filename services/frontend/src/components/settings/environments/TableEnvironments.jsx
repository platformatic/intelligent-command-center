import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TableEnvironments.module.css'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import RowEnvironment from './RowEnvironment'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import gridStyles from '~/styles/GridStyles.module.css'
import { MEDIUM } from '@platformatic/ui-components/src/components/constants'

function TableEnvironments ({
  environmentsLoaded = false,
  environments = [],
  imported = false
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [containerClassName, setContainerClassName] = useState(`${styles.container} ${styles.noDataFoundContainer}`)

  useEffect(() => {
    if (environmentsLoaded) {
      if (environments.length === 0) {
        setContainerClassName(`${styles.container} ${styles.noDataFoundContainer}`)
        setShowNoResult(true)
      } else {
        setContainerClassName(`${styles.container}`)
        setShowNoResult(false)
      }
      setInnerLoading(false)
    }
  }, [environmentsLoaded, environments.length])

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading={innerLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading environments...'
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

    if (showNoResult) {
      return (
        <NoDataAvailable
          iconName={imported ? 'ComputerInIcon' : 'ComputerOutIcon'}
          title={imported ? 'The environment has never been imported.' : 'The environment has never been exported.'}
          iconSize={MEDIUM}
        />
      )
    }

    return (
      <div className={styles.content}>
        <div className={styles.tableEnvironments}>
          <div className={styles.tableHeaders}>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle4}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Date & Time (GMT)</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle4}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{imported ? 'Imported by' : 'Exported By'}</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle4}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Status</span>
              </div>
            </div>
          </div>

          {environments.map(environment => (
            <RowEnvironment
              key={environment.id}
              {...environment}
            />
          ))}

        </div>
      </div>
    )
  }

  return (
    <div className={containerClassName}>
      {renderComponent()}
    </div>
  )
}

TableEnvironments.propTypes = {
  /**
   * environmentsLoaded
    */
  environmentsLoaded: PropTypes.bool,
  /**
   * environments
    */
  environments: PropTypes.array,
  /**
   * imported
    */
  imported: PropTypes.bool
}

export default TableEnvironments
