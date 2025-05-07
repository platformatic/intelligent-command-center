import React, { useEffect, useState } from 'react'
import { useNavigate, generatePath, useRouteLoaderData, useParams } from 'react-router-dom'
import useICCStore from '~/useICCStore'
import { TRANSPARENT, ERROR_RED, WHITE, RICH_BLACK, MEDIUM, MODAL_FULL_RICH_BLACK_V2, WARNING_YELLOW, OPACITY_30, TERTIARY_BLUE } from '@platformatic/ui-components/src/components/constants'
import { Button, ButtonOnlyIcon, Modal, PlatformaticIcon, Tag, Tooltip } from '@platformatic/ui-components'

import ConfirmationModal from '../common/ConfirmationModal'
import { callApiCancelRetryingMessage, callApiDeleteScheduledJob, callApiGetScheduledJobById, callApiGetScheduledJobMessages, callApiGetScheduledJobMetrics, callApiResumeScheduledJob, callApiRunScheduledJobNow, callApiSuspendScheduledJob, callApiUpdateScheduledJob } from '../../api/scheduled-jobs'
import { APPLICATION_DETAILS_SCHEDULED_JOBS } from '../../paths'
import MetricsHeader from './MetricsHeader'
import CallbackUrl from './CallbackUrl'
import MessageTable from './MessageTable'
import JobForm from './JobForm'
import { getFormattedTimeAndDate } from '../../utilities/dates'
import dayjs from 'dayjs'
import cronstrue from 'cronstrue'

import styles from './ScheduledJobDetail.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import tooltipStyles from '~/styles/TooltipStyles.module.css'

/**
 * @typedef {Object} JobDetails
 * @property {string} name - The name of the job
 * @property {string} schedule - The cron expression of the job
 * @property {string} callbackUrl - The callback url of the job
 */

/**
 * @typedef {Object} JobMetrics
 * @property {number} averageExecutionTime - The average execution time of the job
 * @property {number} successes - The number of successes of the job
 * @property {number} failures - The number of failures of the job
 * @property {number} sentMessages - The number of messages sent of the job
 * @property {number} totalRetries - The total number of retries of the job
 */

export default function ScheduledJobDetail () {
  const globalState = useICCStore()
  const { showSplashScreen } = globalState
  const { application } = useRouteLoaderData('appRoot')
  const navigate = useNavigate()
  const [showConfirmDeleteJobModal, setShowConfirmDeleteJobModal] = useState(false)
  const [showConfirmDeleteMessageModal, setShowConfirmDeleteMessageModal] = useState(false)
  const [showSuspendJobModal, setShowSuspendJobModal] = useState(false)
  const [showResumeJobModal, setShowResumeJobModal] = useState(false)
  const [showEditJobModal, setShowEditJobModal] = useState(false)
  const [jobDetails, setJobDetails] = useState(/** @type {JobDetails | null} */ (null))
  const [jobMetrics, setJobMetrics] = useState(/** @type {JobMetrics | null} */ (null))
  const [messages, setMessages] = useState(/** @type {Message[]} */ ([]))
  const [nextScheduledMessage, setNextScheduledMessage] = useState(/** @type {Message | null} */ (null))
  const { id } = useParams()
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await callApiGetScheduledJobMessages(id)

        // Remove messages that have sentAt === null
        const filteredMessages = response.filter(message => message.sentAt !== null)
        setMessages(filteredMessages)
        setNextScheduledMessage(getNextScheduledMessage(response))
        // setMessages(response)
      } catch (err) {
        showSplashScreen({
          title: 'Error',
          message: `Failed to get messages: ${err}`,
          type: 'error'
        })
      }
    }
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [id])
  function onEditJob () {
    setShowEditJobModal(true)
  }

  function onDeleteJob () {
    setShowConfirmDeleteJobModal(true)
  }

  function onSuspendJob () {
    setShowSuspendJobModal(true)
  }

  function onResumeJob () {
    setShowResumeJobModal(true)
  }
  function getNextScheduledMessage (messages) {
    const nextScheduledMessage = messages.find(message => {
      const messageDate = dayjs(message.when)
      const now = dayjs()
      return message.noReschedule === false && messageDate.isAfter(now)
    })
    return nextScheduledMessage
  }
  async function onRunNow () {
    try {
      await callApiRunScheduledJobNow(id)
      showSplashScreen({
        title: 'Job run now',
        message: 'You successfully run the job now',
        showDismissButton: false,
        type: 'success'
      })
    } catch (error) {
      showSplashScreen({
        title: 'Error',
        message: `Failed to run job: ${error}`,
        showDismissButton: false,
        type: 'error'
      })
    }
  }
  async function onSubmitEditJob (formData) {
    try {
      await callApiUpdateScheduledJob(id, formData)
      showSplashScreen({
        title: 'Job updated',
        message: 'You successfully updated the job',
        type: 'success',
        showDismissButton: false,
        onDismiss: () => {
          setShowEditJobModal(false)
          getJobDetails()
        }
      })
    } catch (error) {
      showSplashScreen({
        title: 'Error',
        message: `Failed to update job: ${error}`,
        type: 'error'
      })
    }
  }
  async function getJobDetails () {
    const job = await callApiGetScheduledJobById(id)
    setJobDetails(/** @type {JobDetails} */ (job))
  }

  async function onProceedDelete () {
    await callApiDeleteScheduledJob(id)
    showSplashScreen({
      title: 'Job deleted',
      message: 'You successfully deleted the job',
      type: 'success',
      showDismissButton: false,
      onDismiss: () => {
        const newPath = generatePath(APPLICATION_DETAILS_SCHEDULED_JOBS, {
          applicationId: application.id
        })
        navigate(newPath)
      }
    })
  }

  async function onProceedSuspendJob () {
    try {
      await callApiSuspendScheduledJob(id)
      showSplashScreen({
        title: 'Job suspended',
        message: 'You successfully suspended the job',
        type: 'success',
        showDismissButton: false,
        onDismiss: () => {
          setShowSuspendJobModal(false)
          getJobDetails()
        }
      })
    } catch (error) {
      showSplashScreen({
        title: 'Error',
        message: `Failed to suspend job: ${error}`,
        type: 'error'
      })
    }
  }

  async function onProceedResumeJob () {
    try {
      await callApiResumeScheduledJob(id)
      showSplashScreen({
        title: 'Job resumed',
        message: 'You successfully resumed the job',
        type: 'success',
        showDismissButton: false,
        onDismiss: () => {
          setShowResumeJobModal(false)
          getJobDetails()
        }
      })
    } catch (error) {
      showSplashScreen({
        title: 'Error',
        message: `Failed to resume job: ${error}`,
        type: 'error'
      })
    }
  }

  async function onProceedDeleteMessage (messageId) {
    await callApiCancelRetryingMessage(messageId)
    showSplashScreen({
      title: 'Message cancelled',
      message: 'You successfully cancelled the message',
      type: 'success',
      showDismissButton: false,
      onDismiss: () => {
        setShowConfirmDeleteMessageModal(false)
        getJobDetails()
      }
    })
  }
  async function getJobMetrics () {
    const metrics = await callApiGetScheduledJobMetrics(id)
    setJobMetrics(metrics)
  }

  useEffect(() => {
    getJobMetrics()
  }, [jobDetails])

  useEffect(() => {
    getJobDetails()
  }, [id])

  function renderSuspendPlayButton () {
    if (jobDetails?.paused) {
      return (
        <ButtonOnlyIcon
          type='button'
          onClick={onResumeJob}
          color={WHITE}
          backgroundColor={TRANSPARENT}
          textClass={typographyStyles.desktopButtonSmall}
          paddingClass={commonStyles.smallButtonPadding}
          platformaticIcon={{ iconName: 'CirclePlayIcon', size: MEDIUM, color: WHITE }}
        />
      )
    } else {
      return (
        <ButtonOnlyIcon
          type='button'
          onClick={onSuspendJob}
          color={WHITE}
          backgroundColor={TRANSPARENT}
          textClass={typographyStyles.desktopButtonSmall}
          paddingClass={commonStyles.smallButtonPadding}
          platformaticIcon={{ iconName: 'SuspendIcon', size: MEDIUM, color: WHITE }}
        />

      )
    }
  }

  function renderScheduledTag (lastMessage) {
    if (lastMessage.failed === false && lastMessage.retries > 0) {
      return (
        <Tag
          text={`RETRYING ${lastMessage.retries}/${jobDetails.maxRetries}`}
          color={WARNING_YELLOW}
          fullRounded
          backgroundColor={WARNING_YELLOW}
          opaque={OPACITY_30}
          textClassName={styles.retryTag}
        />
      )
    } else {
      return (
        <Tag
          text='SCHEDULED'
          color={TERTIARY_BLUE}
          fullRounded
          backgroundColor={TERTIARY_BLUE}
          opaque={OPACITY_30}
          textClassName={styles.scheduledTag}
        />
      )
    }
  }
  function renderScheduledAtSection () {
    if (nextScheduledMessage) {
      const cancelDisabled = !(nextScheduledMessage.failed === false && nextScheduledMessage.retries > 0)
      return (

        <div className={`${commonStyles.fullWidth} ${styles.section}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter}`}>
            <h1 className={typographyStyles.desktopBodyLargeSemibold}>Scheduled</h1>
          </div>
          <div className={styles.scheduledAt}>
            <div className={styles.retryTagContainer}>
              {renderScheduledTag(nextScheduledMessage)}
              <div>
                <span className={styles.label}>Scheduled for</span> {getFormattedTimeAndDate(nextScheduledMessage.when)}
              </div>

            </div>

            <div>
              <Button
                label='Cancel'
                onClick={() => {
                  setShowConfirmDeleteMessageModal(true)
                }}
                color={ERROR_RED}
                backgroundColor={TRANSPARENT}
                textClass={typographyStyles.desktopButtonSmall}
                paddingClass={commonStyles.smallButtonPadding}
                disabled={cancelDisabled}
              />
            </div>
          </div>
        </div>
      )
    }
  }
  return (
    <div className={styles.container}>
      {showEditJobModal && (
        <Modal
          layout={MODAL_FULL_RICH_BLACK_V2}
          titleClassName={typographyStyles.desktopBodyLargeSemibold}
          title='Edit Job'
          setIsOpen={setShowEditJobModal}
          onClose={() => setShowEditJobModal(false)}
          showCloseButtonOnTop={false}
        >
          <JobForm
            onSubmit={onSubmitEditJob}
            onCancel={() => setShowEditJobModal(false)}
            model={jobDetails}
          />
        </Modal>
      )}
      {showSuspendJobModal && (
        <ConfirmationModal
          setIsOpen={setShowSuspendJobModal}
          onProceed={onProceedSuspendJob}
          title='Suspend Job'
          buttonText='Suspend job'
          type='confirm'
          text={
            <div>
              <p>This action will halt the Job messaging. It will only resume once you decide to restart it.</p>
              <br />
              <p>You can restart it anytime.</p>
            </div>
        }
        />
      )}
      {showResumeJobModal && (
        <ConfirmationModal
          setIsOpen={setShowResumeJobModal}
          onProceed={onProceedResumeJob}
          title='Resume Job'
          buttonText='Resume job'
          type='confirm'
          text={
            <div>
              <p>Are you sure you want to resume <span className={typographyStyles.desktopBodySmallSemibold}>{jobDetails.name}</span>?</p>
            </div>
            }
        />
      )}
      {showConfirmDeleteJobModal && jobDetails && (
        <ConfirmationModal
          setIsOpen={setShowConfirmDeleteJobModal}
          onProceed={onProceedDelete}
          title='Delete Job'
          buttonText='Delete job'
          type='delete'
          text={
            <div>
              <p>Are you sure you want to cancel <span className={typographyStyles.desktopBodySmallSemibold}>{jobDetails.name}</span>?</p>
              <br />
              <p>This will remove the Job and all the messages contained.</p>
            </div>
          }
        />
      )}

      {showConfirmDeleteMessageModal && jobDetails && (
        <ConfirmationModal
          setIsOpen={setShowConfirmDeleteMessageModal}
          onProceed={() => onProceedDeleteMessage(messages[0].id)}
          title='Cancel scheduled Message'
          buttonText='Cancel scheduled message'
          type='delete'
          text={
            <div>
              <p>You are about to cancel the last schedule message.</p>
              <br />
              <p>The Job will not be deleted. This action will only canceled the last message. The Job will continue to send new messages as per is schedule.</p>
            </div>
          }
        />
      )}
      {jobDetails && (
        <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter}`}>
                <PlatformaticIcon iconName='ScheduledJobsIcon' size={MEDIUM} color={WHITE} />
                <h1 className={typographyStyles.desktopBodyLargeSemibold}>{jobDetails.name}</h1>
              </div>
              <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter} ${commonStyles.gap4}`}>
                <Button
                  type='button'
                  label='Run now'
                  onClick={onRunNow}
                  color={RICH_BLACK}
                  backgroundColor={WHITE}
                  textClass={typographyStyles.desktopButtonSmall}
                  paddingClass={commonStyles.smallButtonPadding}
                />

              </div>
            </div>

            <div className={styles.actionButtons}>
              {jobDetails.jobType === 'USER' && (
                <ButtonOnlyIcon
                  type='button'
                  onClick={onEditJob}
                  color={WHITE}
                  backgroundColor={TRANSPARENT}
                  textClass={typographyStyles.desktopButtonSmall}
                  paddingClass={commonStyles.smallButtonPadding}
                  platformaticIcon={{ iconName: 'GearIcon', size: MEDIUM, color: WHITE }}
                />
              )}
              {renderSuspendPlayButton()}
              {jobDetails.jobType === 'USER' && (
                <ButtonOnlyIcon
                  type='button'
                  onClick={onDeleteJob}
                  color={ERROR_RED}
                  backgroundColor={TRANSPARENT}
                  textClass={typographyStyles.desktopButtonSmall}
                  paddingClass={commonStyles.smallButtonPadding}
                  platformaticIcon={{ iconName: 'TrashIcon', size: MEDIUM, color: ERROR_RED }}
                />
              )}
            </div>
          </div>

          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth}`}>
            <div className={styles.label}>Crontab: &nbsp;
              <Tooltip
                tooltipClassName={tooltipStyles.tooltipDarkStyle}
                content={<span>{cronstrue.toString(jobDetails.schedule)}</span>}
                delay={0}
                offset={20}
                immediateActive={false}
              >
                <span className={styles.value}>{jobDetails.schedule}</span>
              </Tooltip>
            </div>
            <span className={styles.separator}>|</span>
            <span className={styles.label}>
              Target Endpoint:
            </span>
            <span>
              <CallbackUrl
                method={jobDetails.method} url={jobDetails.callbackUrl}
              />
            </span>
          </div>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth}`}>
            <MetricsHeader metrics={jobMetrics} />
          </div>
          {renderScheduledAtSection()}
          <div className={`${commonStyles.fullWidth} ${styles.section}`}>
            <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter}`}>
              <h1 className={typographyStyles.desktopBodyLargeSemibold}>Message History</h1>
            </div>
            <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth}`}>
              <MessageTable messages={messages} jobDetails={jobDetails} />
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
