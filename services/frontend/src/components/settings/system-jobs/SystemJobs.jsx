import React, { useState, useEffect } from 'react'
import { WHITE, MEDIUM, RICH_BLACK, DULLS_BACKGROUND_COLOR } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './SystemJobs.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { Button } from '@platformatic/ui-components'
import SuccessComponent from '~/components/success/SuccessComponent'
import ErrorComponent from '~/components/errors/ErrorComponent'
import Job from './Job'
import { getSystemJobs, setSystemJobs } from '~/api/system-jobs'
import { callApiGetSyncConfig } from '~/api'

const TIMEOUT_AFTER_SUCCESS = 2000

const getSchedules = (data) => {
  return data.reduce((acc, job) => {
    acc[job.name] = job.schedule
    return acc
  }, {})
}

function SystemJobs () {
  // Status of job form. contains `valid` and `newValue` keys (the latter only if changed)
  // The key is the job name
  const [jobStatus, setJobStatus] = useState({
    'traffic-inspector': {
      valid: true
    },
    'ffc-recommender': {
      valid: true
    }
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [schedules, setSchedules] = useState(null)
  const [error, setError] = useState(null)
  const [syncConfig, setSyncConfig] = useState({})
  const [availableJobs, setAvailableJobs] = useState([])

  const [systemJobTypes, setSystemJobTypes] = useState([])

  useEffect(() => {
    if (schedules && availableJobs.length > 0) {
      const isImporter = syncConfig?.enabled && syncConfig?.isImporter

      const allPossibleJobs = [{
        name: 'Traffic Inspector',
        label: 'How often you want the ICC to check for Cache optimization.',
        slug: 'traffic-inspector'
      },
      {
        name: 'Fusion & Fission',
        label: 'How often you want the ICC to check for System improvements.',
        slug: 'ffc-recommender'
      },
      {
        name: 'Scaler Prediction',
        slug: 'scaler',
        label: 'How often you want the ICC to check for Scaler predictions.'
      }]

      // Only add Cold Storage Dump if not in importer mode
      if (!isImporter) {
        allPossibleJobs.push({
          name: 'Cold Storage Dump',
          label: 'How often you want the dump system data to the Cold Storage.',
          slug: 'risk-service-dump',
          cron: schedules['risk-service-dump']
        })
      }

      // Filter jobs based on what's available from the API
      const availableJobNames = availableJobs.map(job => job.name)
      const enabledJobs = allPossibleJobs.filter(job => availableJobNames.includes(job.slug))

      // Update jobStatus based on enabled jobs
      setJobStatus(prev => {
        const newStatus = {}
        enabledJobs.forEach(job => {
          newStatus[job.slug] = prev[job.slug] || { valid: true }
        })
        return newStatus
      })

      setSystemJobTypes(enabledJobs)
    }
  }, [schedules, syncConfig, availableJobs])

  useEffect(() => {
    if (showSuccess) {
      setTimeout(() => {
        setShowSuccess(false)
      }, TIMEOUT_AFTER_SUCCESS)
    }
  }, [showSuccess])

  useEffect(() => {
    async function loadData () {
      try {
        const [systemJobsResponse, syncConfigResponse] = await Promise.all([
          getSystemJobs(),
          callApiGetSyncConfig()
        ])
        const schedules = getSchedules(systemJobsResponse)
        setSchedules(schedules)
        setSyncConfig(syncConfigResponse)
        setAvailableJobs(systemJobsResponse)
      } catch (error) {
        console.error(`Error on get exports ${error}`)
        setError(error)
        setShowErrorComponent(true)
      }
    }
    loadData()
  }, [])

  // TODO: use when this is available: https://github.com/platformatic/icc/issues/1888
  // const isDirty = Object.values(jobStatus).some(job => job.newValue)

  const setFormStatus = job => (valid, newValue) => {
    setJobStatus(prev => {
      return {
        ...prev,
        [job]: {
          valid,
          newValue
        }
      }
    })
  }

  const isSaveDisabled = Object.values(jobStatus).some(job => !job.valid)

  const applyChanges = async () => {
    const data = Object.entries(jobStatus).reduce((acc, [key, value]) => {
      if (value.newValue) {
        acc[key] = value.newValue
      }
      return acc
    }, {})
    try {
      const newData = await setSystemJobs(data)
      setShowSuccess(true)
      const schedules = getSchedules(newData)
      setSchedules(schedules)
    } catch (error) {
      console.error(`Error on get internal jobs ${error}`)
      setError(error)
      setShowErrorComponent(true)
    }
  }

  if (showSuccess) {
    return (
      <SuccessComponent
        title='Changes Applied'
        subtitle='You successfully applied the changes to the system jobs.'
      />
    )
  }

  if (showErrorComponent) {
    return (
      <ErrorComponent
        error={error} onClickDismiss={() => {
          setShowErrorComponent(false)
        }}
      />
    )
  }

  return (
    <div className={`${commonStyles.fullWidth}`}>
      <div>
        <div className={`${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
              <Icons.ScheduledJobSettingsIcon color={WHITE} size={MEDIUM} />
              <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>System Jobs</p>
            </div>
          </div>
          <div className={`${commonStyles.smallFlexRow} ${styles.subtitle}`}>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>
              This section allows you to set a specific recurrence for each job inside your system.
            </span>
          </div>
        </div>
      </div>
      {schedules &&
        <div className={`${commonStyles.smallFlexCol} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${styles.jobs}`}>
          {systemJobTypes.length > 0
            ? (
                systemJobTypes.map((job) => (
                  <div key={job.name} className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${styles.job}`}>
                    <Job
                      title={job.name}
                      label={job.label}
                      cron={schedules[job.slug]}
                      setFormStatus={setFormStatus(job.slug)}
                    />
                  </div>
                ))
              )
            : (
              <div className={`${commonStyles.mediumFlexRow} ${commonStyles.fullWidth} ${styles.noJobsMessage}`}>
                <div className={`${commonStyles.tinyFlexBlock}`}>
                  <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite}`}>
                    No ICC system jobs enabled
                  </p>
                  <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>
                    See documentation for more information
                  </p>
                </div>
              </div>
              )}
        </div>}
      {systemJobTypes.length > 0 && (
        <Button
          label='Apply Changes'
          onClick={() => applyChanges()}
          color={RICH_BLACK}
          backgroundColor={WHITE}
          hoverEffect={DULLS_BACKGROUND_COLOR}
          paddingClass={commonStyles.smallButtonPadding}
          textClass={typographyStyles.desktopButtonSmall}
          bordered={false}
          disabled={isSaveDisabled}
        />
      )}
    </div>
  )
}

export default SystemJobs
