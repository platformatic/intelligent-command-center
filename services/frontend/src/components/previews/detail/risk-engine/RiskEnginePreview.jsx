import React, { useState, useEffect } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox } from '@platformatic/ui-components'
import { BLACK_RUSSIAN, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import styles from './RiskEnginePreview.module.css'
import { getApiApplication } from '~/api'
import Changes from './Changes'
import PreviewChanges from './PreviewChanges'

function getRiskColor (risk) {
  if (!risk) {
    return styles.riskUndefined
  }
  if (risk < 15) {
    return styles.risk0
  }
  if (risk >= 15 && risk < 25) {
    return styles.risk15
  }
  if (risk >= 25 && risk < 35) {
    return styles.risk25
  }
  if (risk >= 35 && risk < 50) {
    return styles.risk35
  }
  if (risk >= 50 && risk < 65) {
    return styles.risk50
  }
  if (risk >= 65 && risk < 75) {
    return styles.risk65
  }
  if (risk >= 75 && risk < 85) {
    return styles.risk75
  }
  if (risk >= 85 && risk < 100) {
    return styles.risk85
  }
  return styles.risk100
}

function getLabelRisk (risk) {
  if (risk === '' || risk === null || risk === undefined) return '-'
  return `${risk}%`
}

function RiskEnginePreview (props) {
  const [appName, setAppName] = useState(null)
  const [changePreviewElements, setChangePreviewElements] = useState({})
  const { applicationId, openapi, graphql, risk, db } = props
  const boxRiskStyle = `${styles.riskDataContainer} ${commonStyles.flexBlockNoGap} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter} ${getRiskColor(risk)}`

  useEffect(() => {
    if (applicationId) {
      async function loadApplication () {
        const applicationSelected = await getApiApplication(applicationId)
        setAppName(applicationSelected.name)
      }
      loadApplication()
    }
  }, [applicationId])

  function handleClickDetail (detail, payload) {
    setChangePreviewElements({ detailType: detail, ...payload })
  }

  return (
    <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
      <BorderedBox
        color={TRANSPARENT}
        backgroundColor={BLACK_RUSSIAN}
        classes={styles.boxRiskDeploying}
      >
        <div className={styles.topBoxContainer}>
          <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>
            The risk of deploying is
          </p>
          <div className={boxRiskStyle}>
            <p className={typographyStyles.desktopBodySemibold}>{getLabelRisk(risk)}</p>
          </div>
          {appName &&
            <>
              <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>
                Changes for the application: &nbsp;
              </p>
              <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{appName}</p>
            </>}

        </div>
      </BorderedBox>

      <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsStart} ${commonStyles.fullWidth}`}>
        <Changes openapi={openapi} graphql={graphql} dbChanges={db?.dbChanges ?? []} onClickViewDetail={handleClickDetail} />
        <PreviewChanges {...changePreviewElements} />
      </div>

    </div>
  )
}

export default RiskEnginePreview
