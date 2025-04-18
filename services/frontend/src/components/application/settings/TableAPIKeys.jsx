import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TableAPIKeys.module.css'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import RowApiKey from './RowApiKey'
import gridStyles from '~/styles/GridStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'

function TableAPIKeys ({
  apiKeysLoaded = false,
  apiKeys = [],
  onClickRegenerate = () => {},
  onClickRevoke = () => {}
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)

  useEffect(() => {
    if (apiKeysLoaded) {
      if (apiKeys.length === 0) {
        setShowNoResult(true)
      } else {
        setShowNoResult(false)
      }
      setInnerLoading(false)
    }
  }, [apiKeysLoaded, apiKeys.length])

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading={innerLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading your apiKeys...'
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

    if (showNoResult) { return <NoDataAvailable iconName='APIKeyIcon' title='There are no API Keys for this Application' containerClassName={styles.noDataContainer} /> }

    return (
      <div className={styles.content}>
        <div className={styles.tableApiKey}>
          <div className={styles.tableHeaders}>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle4}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Name</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle2}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Value</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle2}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Used On</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle2}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Created On</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle2}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite}`}>Actions</span>
              </div>
            </div>
          </div>

          {apiKeys.map(apikey => (
            <RowApiKey key={apikey.id} {...apikey} onClickRegenerate={() => onClickRegenerate({ ...apikey })} onClickRevoke={() => onClickRevoke({ ...apikey })} />
          ))}

        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {renderComponent()}
    </div>
  )
}

TableAPIKeys.propTypes = {
  /**
   * apiKeysLoaded
    */
  apiKeysLoaded: PropTypes.bool,
  /**
   * apiKeys
    */
  apiKeys: PropTypes.array,
  /**
   * onClickRegenerate
    */
  onClickRegenerate: PropTypes.func,
  /**
   * onClickRevoke
    */
  onClickRevoke: PropTypes.func
}

export default TableAPIKeys
