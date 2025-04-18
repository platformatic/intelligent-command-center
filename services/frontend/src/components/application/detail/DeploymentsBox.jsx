import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { WHITE, OPACITY_30, TRANSPARENT, MEDIUM, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'
import styles from './DeploymentsBox.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import { BorderedBox, Button, LoadingSpinnerV2, VerticalSeparator } from '@platformatic/ui-components'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import Icons from '@platformatic/ui-components/src/components/icons'
import { getApiDeploymentsHistory, getGithubUserInfo } from '~/api'
import { NavLink, useParams } from 'react-router-dom'

function DeploymentsBox ({
  gridClassName = '',
  application
}) {
  const [latestDeployment, setLatestDeployment] = useState({})
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [disabledDeploymentHistory, setDisabledDeploymentHistory] = useState(true)
  const [gravatarUrl, setGravatarUrl] = useState('./githubUser.png')
  const { taxonomyId } = useParams()

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

  useEffect(() => {
    if (latestDeployment?.commitUserEmail !== '-') {
      async function getAvatarUrl () {
        try {
          const data = await getGithubUserInfo(latestDeployment.commitUserEmail)
          const data1 = await data.json()
          if ((data1.items?.length ?? 0) > 0 && data1.items[0]?.avatar_url) {
            setGravatarUrl(`${data1.items[0]?.avatar_url}&s=24`)
          }
        } catch (error) {
          console.error(`Error getting image gravatar: ${error}`)
        }
      }
      getAvatarUrl()
    }
  }, [latestDeployment.commitUserEmail])

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
            <p className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{latestDeployment?.taxonomyName ?? '-'}</p>
            <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>
              <span className={` ${typographyStyles.opacity70} `}>Manually deployed</span>
            </p>
          </div>

          {(latestDeployment?.mainIteration ?? 0) >= 0 && (
            <>
              <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />
              <div className={commonStyles.tinyFlexRow}>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} `}>Generation number:</span>
                <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{latestDeployment.mainIteration}</span>
              </div>
            </>
          )}
        </div>

        <div className={styles.rowContainer}>

          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Deployed on:</span>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{getFormattedTimeAndDate(latestDeployment?.deployedOn ?? '-')}</span>
          </div>

          {(latestDeployment?.commitUserEmail ?? '-') !== '-' && (
            <>
              <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>by:</span>
                <div className={`${commonStyles.tinyFlexRow}`}>
                  <div className={commonStyles.githubUser} style={{ backgroundImage: `url(${gravatarUrl}` }} />
                  <div className={`${commonStyles.flexGrow}`}>
                    <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{latestDeployment.commitUserEmail}</p>
                  </div>
                </div>
              </div>
            </>
          )}

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
            <NavLink to={`/${taxonomyId}/applications/${application.id}/deployment-history`}>
              <Button
                type='button'
                label='View Deployment History'
                // onClick={() => viewDeploymentHistory()}
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

DeploymentsBox.propTypes = {
  /**
   * gridClassName
    */
  gridClassName: PropTypes.string
}

export default DeploymentsBox
