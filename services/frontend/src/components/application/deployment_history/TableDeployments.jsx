import React from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TableDeployments.module.css'
import RowDeployment from './RowDeployment'
import { useNavigate } from 'react-router-dom'
import { TAXONOMY_PATH, PREVIEWS_DETAIL_PATH } from '~/ui-constants'

function TableDeployments ({
  deployments = []
}) {
  const navigate = useNavigate()

  function handleClickTaxonomy (taxonomyId, main) {
    navigate(main ? TAXONOMY_PATH : PREVIEWS_DETAIL_PATH.replace(':taxonomyId', taxonomyId))
  }

  function renderComponent () {
    return (
      <div className={styles.tableDeploymentsContent}>
        <div className={styles.tableDeployments}>
          <div className={styles.tableHeaders}>
            <div className={`${styles.tableHeader}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Deployed</span>
              </div>
            </div>
            <div className={`${styles.tableHeader}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Deployed on (GMT)</span>
              </div>
            </div>
            <div className={`${styles.tableHeader}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Commit Message</span>
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
            <RowDeployment key={deployment.id} {...deployment} historyMode index={index} onClickTaxonomy={handleClickTaxonomy} />
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

TableDeployments.propTypes = {
  /**
   * deployments
    */
  deployments: PropTypes.array

}

export default TableDeployments
