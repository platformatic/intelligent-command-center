import React, { useEffect, useState, useCallback } from 'react'

import { MEDIUM, MODAL_FULL_RICH_BLACK, RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'
import { Button, Forms, Icons, Modal, SearchBarV2 } from '@platformatic/ui-components'

import styles from './ScheduledJobs.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'

import NoDataFound from '~/components/ui/NoDataFound'
import { callApiCreateScheduledJob, callApiGetScheduledJobs, callApiGetScheduledJobsMetrics } from '../../api/scheduled-jobs'
import JobsTable from './JobsTable'
import useICCStore from '~/useICCStore'

import MetricsHeader from './MetricsHeader'
import JobForm from './JobForm'
import { useRouteLoaderData } from 'react-router-dom'

export default function ScheduledJob () {
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [metrics, setMetrics] = useState({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState({ label: 'All statuses', value: 'all' })
  const { taxonomyId, application } = useRouteLoaderData('appRoot')
  const globalState = useICCStore()
  const {
    showSplashScreen
  } = globalState

  const filterOptions = [
    { label: 'All statuses', value: 'all' },
    { label: 'Success', value: 'success' },
    { label: 'Failed', value: 'failed' }
  ]
  async function getJobs () {
    const jobs = await callApiGetScheduledJobs(taxonomyId, application.id)
    setJobs(jobs)
    setFilteredJobs(jobs)
  }

  async function getMetrics () {
    const metrics = await callApiGetScheduledJobsMetrics(taxonomyId, application.id)
    setMetrics(metrics)
  }

  function handleSearch (value) {
    setSearch(value)
  }
  function handleSelectJobs (event) {
    const selectedFilter = filterOptions.find((option) => option.value === event.detail.value)
    setStatusFilter(selectedFilter)
  }

  function getFilteredJobs () {
    let output = []
    if (search !== '' && statusFilter.value !== 'all') {
      output = jobs
        .filter((job) => job.name.toLowerCase().includes(search.toLowerCase()) || job.callbackUrl.toLowerCase().includes(search.toLowerCase()))
        .filter((job) => job.status === statusFilter.value)
    } else if (search !== '' && statusFilter.value === 'all') {
      output = jobs
        .filter((job) => job.name.toLowerCase().includes(search.toLowerCase()) || job.callbackUrl.toLowerCase().includes(search.toLowerCase()))
    } else if (search === '' && statusFilter.value !== 'all') {
      output = jobs.filter((job) => job.status === statusFilter.value)
    } else {
      output = jobs
    }

    return output
  }

  useEffect(() => {
    setFilteredJobs(getFilteredJobs())
  }, [search, statusFilter])

  useEffect(() => {
    getJobs()
    getMetrics()
  }, [])

  const onCreateJobButtonClicked = useCallback(() => {
    setShowModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
  }, [])

  const handleCreateJob = useCallback(async (formData) => {
    try {
      const payload = {
        ...formData,
        paused: false,
        protected: false,
        taxonomyId,
        applicationId: application.id,
        jobType: 'USER'
      }
      await callApiCreateScheduledJob(payload)
      showSplashScreen({
        title: 'Job updated',
        content: 'You successfully updated the job',
        type: 'success',
        onDismiss: () => {
          setShowModal(false)
        }
      })
      // After successful creation, refresh the jobs list
      await getJobs()
    } catch (error) {
      console.error('Error creating job:', error)
      showSplashScreen({
        title: 'Error creating job',
        content: error.message,
        type: 'error'
      })
    }
  }, [])

  function renderJobs () {
    if (filteredJobs.length === 0) {
      return (
        <NoDataFound fullCentered title='No scheduled jobs found' />
      )
    }
    return <JobsTable jobs={filteredJobs} />
  }
  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          <div className={commonStyles.tinyFlexRow}>
            <Icons.ScheduledJobsIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Scheduled Jobs</p>
          </div>
          <Button
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
            label='Create new job'
            color={RICH_BLACK}
            backgroundColor={WHITE}
            platformaticIcon={{ iconName: 'ScheduledJobsIcon', color: RICH_BLACK }}
            onClick={onCreateJobButtonClicked}
          />
          <div />
        </div>
      </div>
      <MetricsHeader metrics={metrics} />

      <div className={styles.searchAndFilter}>
        <div className={styles.search}>
          <SearchBarV2 onChange={handleSearch} placeholder='Search for Job name or target endpoint' onClear={() => setSearch('')} />
        </div>
        <div className={styles.filter}>
          <Forms.Select
            defaultContainerClassName={styles.selectEvents}
            backgroundColor={RICH_BLACK}
            borderColor={WHITE}
            defaultOptionsClassName={`${typographyStyles.desktopButtonSmall} ${styles.maxHeightOptions}`}
            options={filterOptions}
            onSelect={handleSelectJobs}
            optionsBorderedBottom={false}
            mainColor={WHITE}
            borderListColor={WHITE}
            value={statusFilter.label}
            inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite} ${styles.heightSelectClass}`}
            paddingClass={styles.selectPaddingClass}
            handleClickOutside
          />
        </div>
      </div>
      <div className={styles.jobs}>
        {renderJobs()}
      </div>

      {showModal && (
        <Modal
          layout={MODAL_FULL_RICH_BLACK}
          setIsOpen={handleCloseModal}
          title='Create Scheduled Job'
          titleClassName={typographyStyles.desktopBodyLargeSemibold}
        >
          <div className={commonStyles.modalContent}>
            <JobForm
              onSubmit={handleCreateJob}
              onCancel={handleCloseModal}
              model={null}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
