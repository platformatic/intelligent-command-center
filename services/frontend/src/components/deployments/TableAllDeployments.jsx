import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TableAllDeployments.module.css'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import NoDataFound from '~/components/ui/NoDataFound'
import RowAllDeployment from './RowAllDeployment.jsx'
import { useNavigate } from 'react-router-dom'
import { TAXONOMY_PATH, PREVIEWS_DETAIL_PATH } from '~/ui-constants'

function TableAllDeployments ({
  deploymentsLoaded = false,
  deployments = []
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (deploymentsLoaded) {
      if (deployments.length === 0) {
        setShowNoResult(true)
      } else {
        setShowNoResult(false)
      }
      setInnerLoading(false)
    } else {
      setInnerLoading(true)
    }
  }, [deploymentsLoaded, deployments.length])

  function handleClickTaxonomy (taxonomyId, main) {
    navigate(main ? TAXONOMY_PATH : PREVIEWS_DETAIL_PATH.replace(':taxonomyId', taxonomyId))
  }

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading={innerLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading your deployments...'
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

    if (showNoResult) { return <NoDataFound title='No Deployments yet' subTitle={<span>There’s no track of deployments.</span>} /> }

    return (
      <div className={styles.tableDeploymentsContent}>
        <div className={styles.tableDeployments}>
          <div className={styles.tableHeaders}>
            <div className={`${styles.tableHeader}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Watt Name</span>
              </div>
            </div>
            <div className={`${styles.tableHeader}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Deployment & Generation</span>
              </div>
            </div>
            <div className={`${styles.tableHeader}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Deployed on (GMT)</span>
              </div>
            </div>
            <div className={`${styles.tableHeader}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Last Commit by</span>
              </div>
            </div>
            <div className={`${styles.tableHeader}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>&nbsp;</span>
              </div>
            </div>
          </div>

          {deployments.map((deployment, index) => (
            <RowAllDeployment key={deployment.id} {...deployment} index={index} onClickTaxonomy={handleClickTaxonomy} />
          ))}

        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.tableDeploymentsContainer} ${commonStyles.fullWidth}`}>
      {renderComponent()}
    </div>
  )
}

export default TableAllDeployments
