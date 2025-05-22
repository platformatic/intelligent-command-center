import React, { useEffect, useState } from 'react'
import { Button, PlatformaticIcon } from '@platformatic/ui-components'
import Forms from '@platformatic/ui-components/src/components/forms'
import { MEDIUM, RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'
import styles from './JobForm.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import MethodSelector from './MethodSelector'
import HeadersForm from './HeadersForm'
import { isValidCron } from 'cron-validator'
import cronstrue from 'cronstrue'
export default function JobForm ({ onSubmit, onCancel, model }) {
  const [formData, setFormData] = useState({})
  const [isFormDirty, setIsFormDirty] = useState(false)
  useEffect(() => {
    if (model) {
      setFormData(model)
      setIsFormDirty(false)
    } else {
      setFormData({
        name: '',
        schedule: '',
        method: 'GET',
        callbackUrl: '',
        maxRetries: 5, // TODO: Should be a constant or configurable?
        body: '',
        headers: {}
      })
    }
  }, [])
  useEffect(() => {
    setIsFormDirty(true)
  }, [formData])

  const [cronDescription, setCronDescription] = useState('')

  const [formErrors, setFormErrors] = useState({})

  function formHasErrors () {
    return Object.values(formErrors).some(error => error !== '')
  }

  function formIsValid () {
    const requiredFields = ['name', 'schedule', 'callbackUrl']
    return requiredFields.every(field => formData[field] !== '')
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    switch (name) {
      case 'schedule':
        setCronDescription('')
        if (!isValidCron(value)) {
          setFormErrors(prev => ({
            ...prev,
            schedule: 'Invalid cron expression'
          }))
        } else {
          setFormErrors(prev => ({
            ...prev,
            schedule: ''
          }))
          setCronDescription(cronstrue.toString(value))
        }
        break
      case 'callbackUrl':
        try {
          /* eslint-disable no-new */
          new URL(value)
          setFormErrors(prev => ({
            ...prev,
            callbackUrl: ''
          }))
        } catch {
          setFormErrors(prev => ({
            ...prev,
            callbackUrl: 'Invalid callback URL'
          }))
        }
        break
      case 'name':
        if (value.length < 3) {
          setFormErrors(prev => ({
            ...prev,
            name: 'Name must be at least 3 characters long'
          }))
        } else {
          setFormErrors(prev => ({
            ...prev,
            name: ''
          }))
        }
        break
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  function formatBodyForTextArea () {
    if (formData.body === '') {
      return ''
    }
    try {
      return JSON.stringify(JSON.parse(formData.body), null, 2)
    } catch {
      return formData.body
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    onSubmit(formData)
  }
  if (formData.method === undefined) {
    return <div>Loading...</div>
  }

  let modalTitle = 'Create New Job'
  let modalSecondaryText = 'Set up and configure your new Job'
  let icon = 'ScheduledJobsCreateIcon'
  if (model) {
    modalTitle = 'Update Job'
    modalSecondaryText = 'Update and configure your Job'
    icon = 'ScheduledJobSettingsIcon'
  }
  return (
    <div className={styles.form}>
      <div className={styles.formHeader}>
        <div className={styles.icon}>
          <PlatformaticIcon iconName={icon} color={WHITE} size={MEDIUM} />
        </div>
        <div className={styles.title}>{modalTitle}</div>
        <div className={styles.secondaryText}>{modalSecondaryText}</div>

      </div>
      <div className={`${styles.row} ${styles.twoFields}`}>
        <Forms.Field
          title='Job Name'
          titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}
          required
        >
          <Forms.Input
            name='name'
            value={formData.name}
            onChange={handleChange}
            placeholder='Enter job name'
            borderColor={WHITE}
            backgroundColor={RICH_BLACK}
            inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.fieldPaddingClass}`}
            errorMessage={formErrors.name}
          />
        </Forms.Field>
        <div className={styles.cronContainer}>
          <Forms.Field
            title='Cron Expression'
            titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}
            helperClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}
            required
          >
            <Forms.Input
              name='schedule'
              value={formData.schedule}
              onChange={handleChange}
              placeholder='* * * * *'
              borderColor={WHITE}
              backgroundColor={RICH_BLACK}
              inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.fieldPaddingClass}`}
              errorMessage={formErrors.schedule}
            />

          </Forms.Field>
          <div className={styles.cronDescription}>
            {cronDescription}
          </div>
        </div>
      </div>
      <div className={`${styles.row} ${styles.twoFields}`}>
        <div>
          <Forms.Field
            title='Method'
            required
            titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}
          >
            <MethodSelector
              selectedValue={formData.method}
              onChange={(method) => handleChange({ target: { name: 'method', value: method } })}
            />
          </Forms.Field>
        </div>

        <Forms.Field
          required
          title='Target Endpoint'
          titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}
        >
          <Forms.Input
            name='callbackUrl'
            value={formData.callbackUrl}
            onChange={handleChange}
            placeholder='Enter callback URL'
            borderColor={WHITE}
            backgroundColor={RICH_BLACK}
            inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.fieldPaddingClass}`}
            errorMessage={formErrors.callbackUrl}
          />
        </Forms.Field>

      </div>

      <div className={`${styles.row} ${styles.twoFields}`}>
        <HeadersForm headers={formData.headers} onChange={(newHeaders) => handleChange({ target: { name: 'headers', value: newHeaders } })} />
      </div>

      <div className={`${styles.row} ${styles.twoFields}`}>
        <Forms.Field
          title='Body'
          titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}
        >
          <div className={styles.textAreaContainer}>
            <textarea
              name='body'
              value={formatBodyForTextArea()}
              onChange={handleChange}
              placeholder='Enter body'
              rows={4}
              className={`${styles.textArea} ${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
            />
          </div>
        </Forms.Field>
      </div>

      <div className={styles.buttonsContainer}>
        <Button
          type='button'
          onClick={onCancel}
          label='Discard'
          color={WHITE}
          backgroundColor={RICH_BLACK}
          textClass={typographyStyles.desktopButtonSmall}
          paddingClass={commonStyles.smallButtonPadding}
        />
        <Button
          type='submit'
          label={model ? 'Update Job' : 'Create Job'}
          color={RICH_BLACK}
          backgroundColor={WHITE}
          textClass={typographyStyles.desktopButtonSmall}
          paddingClass={commonStyles.smallButtonPadding}
          onClick={handleSubmit}
          disabled={!isFormDirty || (!formIsValid() || formHasErrors())}
        />
      </div>

    </div>
  )
}
