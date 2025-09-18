import React, { useEffect, useState } from 'react'
import { WHITE, TRANSPARENT, MEDIUM, SMALL, WARNING_YELLOW, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'
import styles from './ApplicationsBox.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import { BorderedBox, Button, LoadingSpinnerV2 } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'
import { getApiCompliancy } from '~/api'
import { generatePath, useNavigate } from 'react-router-dom'
import { APPLICATION_DETAILS_ALL_SERVICES } from '../../../paths'

function getFilteredOutdatedApplications (allApplications, comparingApplications) {
  return allApplications.filter(application => {
    if (comparingApplications[application.id]) {
      const foundOutdated = Object.keys(comparingApplications[application.id]).find(dependency => {
        const { current, wanted } = comparingApplications[application.id][dependency]
        return current !== wanted
      })
      return foundOutdated !== undefined
    } else {
      return false
    }
  })
}

function InnerApplicationsBox ({
  numberOfApplications,
  applications,
  sentence,
  values
}) {
  function displayApplications () {
    const outdatedValue = values[0]
    const upToDateValue = values[1]
    const outdated = Array.from(Array(outdatedValue.value).keys()).map((_) => ({ outdated: true }))
    const upToDate = Array.from(Array(upToDateValue.value).keys()).map((_) => ({ outdated: false }))
    return outdated.concat(upToDate).map((element, index) => (
      <div className={`${element.outdated ? styles[outdatedValue.className] : styles[upToDateValue.className]} ${commonStyles.flexGrow}`} key={index}>&nbsp;</div>
    ))
  }

  return (
    <div className={styles.innerServiceBoxContainer}>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
        <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{numberOfApplications}</h4>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>of {applications}</span>
        <Icons.AlertIcon color={WARNING_YELLOW} size={SMALL} />
      </div>
      <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{sentence}</span>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${styles.flexWrap}`}>
        {displayApplications()}
      </div>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
        {values.map((value, index) => (
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${index === 1 ? commonStyles.justifyEnd : ''}`} key={value.key_value}>
            <span className={styles[value.className]}>&nbsp;</span>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{value.label}</span>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{value.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
function reorderApplications (applications = []) {
  if (applications.length === 0) { return applications }
  return applications.filter(application => application.entrypoint).concat(applications.filter(application => !application.entrypoint))
}
function ApplicationsBox ({
  application,
  gridClassName = ''
}) {
  const wattSelectedApplications = reorderApplications(application.state.services)
  const [applicationsLength, setApplicationsLength] = useState(0)
  const [outdatedApplications, setOutdatedApplications] = useState(0)
  const [innerLoading, setInnerLoading] = useState(true)
  const navigate = useNavigate()

  function viewAllApplications () {
    navigate(generatePath(APPLICATION_DETAILS_ALL_SERVICES, { applicationId: application.id }))
  }

  useEffect(() => {
    async function loadCompliancy () {
      const report = await getApiCompliancy(application.id)
      let applications = {}
      if (report.length > 0) {
        const ruleSet = report[0].ruleSet
        const index = Object.keys(report[0].ruleSet).find(rule => report[0].ruleSet[rule].name === 'outdated-npm-deps')
        applications = ruleSet[index]?.details?.services ?? {}
      }

      setApplicationsLength(wattSelectedApplications.length)
      setOutdatedApplications(getFilteredOutdatedApplications(wattSelectedApplications, applications).length)
      setInnerLoading(false)
    }
    loadCompliancy()
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

    return (outdatedApplications > 0)
      ? (
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} `}>
          <InnerApplicationsBox
            numberOfApplications={outdatedApplications}
            applications={applicationsLength}
            sentence='Applications containing outdated dependencies'
            values={[{
              key_value: 'outdated_dependencies',
              label: 'Application containing outdated dependencies:',
              className: 'boxOutdatedDependencies',
              value: outdatedApplications,
              value_perc: ((outdatedApplications / applicationsLength) * 100)
            }, {
              key_value: 'up_to_date_dependencies',
              label: 'Up to Date Application:',
              className: 'boxUpToDateDependencies',
              value: applicationsLength - outdatedApplications,
              value_perc: (((applicationsLength - outdatedApplications) / applicationsLength) * 100)
            }]}
          />
        </div>
        )
      : (
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter}`}>
          <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{applicationsLength}</h4>
          <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>All applications are up to date</p>
        </div>
        )
  }

  return (
    <BorderedBox classes={`${styles.borderexBoxContainer} ${gridClassName}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <Icons.ServiceIcon
              color={WHITE}
              size={MEDIUM}
            />
            <div className={styles.applicationName}>
              <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>Applications</p>
            </div>
          </div>
          <div className={styles.buttonContainer}>
            <Button
              type='button'
              label='View All Applications'
              onClick={() => viewAllApplications()}
              color={WHITE}
              backgroundColor={TRANSPARENT}
              paddingClass={commonStyles.smallButtonPadding}
              textClass={typographyStyles.desktopButtonSmall}
              disabled={innerLoading}
            />
          </div>
        </div>
        {renderContent()}
      </div>
    </BorderedBox>
  )
}

export default ApplicationsBox
