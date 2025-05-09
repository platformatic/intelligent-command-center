import React, { useEffect, useState } from 'react'
import { WHITE, TRANSPARENT, MEDIUM, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'
import styles from './DeploymentsBox.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import { BorderedBox, Button, LoadingSpinnerV2 } from '@platformatic/ui-components'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import Icons from '@platformatic/ui-components/src/components/icons'
import { getApiDeploymentsHistory } from '~/api'
import { NavLink } from 'react-router-dom'

function DeploymentsBox ({
  gridClassName = '',
  application
}) {
  const [latestDeployment, setLatestDeployment] = useState({})
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [disabledDeploymentHistory, setDisabledDeploymentHistory] = useState(true)

  useEffect(() => {
    setInnerLoading(true)
    setShowNoResult(false)
    async function loadLastDeployment () {
      try {
        const response = await getApiDeploymentsHistory({
          filterDeploymentsByApplicationId: application.id,
          limit: 1,
          offset: 0
        })
        const { deployments } = response
        setLatestDeployment(deployments.length > 0 ? deployments[0] : [])
        setDisabledDeploymentHistory(deployments.length === 0)
      } catch (error) {
        console.error(`Error on getApiDeploymentsHistory ${error}`)
        setShowNoResult(true)
      }
    }
    loadLastDeployment()

    setInnerLoading(false)
  }, [])

  function renderContent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading ...'
            }]
          }}
          containerClassName={loadingSpinnerStyles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (showNoResult) { return <NoDataAvailable iconName='NoDeploymentsIcon' title='There are no deployments yet' /> }
    return (
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${commonStyles.justifyCenter} ${commonStyles.flexGrow}`}>
        <div className={styles.rowContainer}>
          <div className={commonStyles.tinyFlexRow}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} `}>Image Id:</span>
            <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite} ${typographyStyles.terminal}`}>{latestDeployment.imageId}</span>
          </div>
        </div>

        <div className={styles.rowContainer}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Deployed on:</span>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{getFormattedTimeAndDate(latestDeployment?.createdAt ?? '-')}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <BorderedBox classes={`${styles.borderexBoxContainer} ${gridClassName}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${styles.addFullHeight}`}>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${styles.flexWrap}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <Icons.RocketIcon
              color={WHITE}
              size={MEDIUM}
            />
            <div className={styles.applicationName}>
              <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>Latest Deployment</p>
            </div>
          </div>
          <div className={styles.buttonContainer}>
            <NavLink to={`/applications/${application.id}/deployment-history`}>
              <Button
                type='button'
                label='View Deployment History'
                color={WHITE}
                backgroundColor={TRANSPARENT}
                paddingClass={commonStyles.smallButtonPadding}
                textClass={typographyStyles.desktopButtonSmall}
                disabled={disabledDeploymentHistory}
              />
            </NavLink>

          </div>
        </div>
        {renderContent()}
      </div>
    </BorderedBox>
  )
}

export default DeploymentsBox
