import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TableConfigureIngressPaths.module.css'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import RowIngressPath from './RowIngressPath'
import NoDataFound from '~/components/ui/NoDataFound'
import gridStyles from '~/styles/GridStyles.module.css'

function TableConfigureIngressPaths ({
  ingressPathsLoaded = false,
  ingressPaths = [],
  onClickAddPath = () => {},
  onClickEdit = () => {},
  onClickDelete = () => {}
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)

  useEffect(() => {
    if (ingressPathsLoaded) {
      if (ingressPaths.length === 0) {
        setShowNoResult(true)
      } else {
        setShowNoResult(false)
      }
      setInnerLoading(false)
    }
  }, [ingressPathsLoaded, ingressPaths.length])

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading={innerLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading your ingress paths...'
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

    if (showNoResult) { return <NoDataFound title='No Ingress Paths found' subTitle={<span>There are no ingress paths on your apps.<br />.</span>} /> }

    return (
      <div className={styles.content}>
        <div className={styles.tableConfigureIngressPaths}>
          <div className={styles.tableHeaders}>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle4}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Application Name</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle6}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Path</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle2}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>&nbsp;</span>
              </div>
            </div>
          </div>

          {ingressPaths.map((ingressPath, index) => (
            <RowIngressPath
              key={`${ingressPath.applicationId}-${index}`}
              id={ingressPath?.id ?? `index-${index}`}
              {...ingressPath}
              onClickAddPath={() => onClickAddPath(ingressPath)}
              onClickEdit={() => onClickEdit(ingressPath)}
              onClickDelete={() => onClickDelete(ingressPath)}
            />
          ))}

        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.container}`}>
      {renderComponent()}
    </div>
  )
}

TableConfigureIngressPaths.propTypes = {
  /**
   * ingressPathsLoaded
    */
  ingressPathsLoaded: PropTypes.bool,
  /**
   * ingressPaths
    */
  ingressPaths: PropTypes.array,
  /**
   * onClickAddPath
    */
  onClickAddPath: PropTypes.func,
  /**
   * onClickEdit
    */
  onClickEdit: PropTypes.func,
  /**
   * onClickDelete
    */
  onClickDelete: PropTypes.func
}

export default TableConfigureIngressPaths
