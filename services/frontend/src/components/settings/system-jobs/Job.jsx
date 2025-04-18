import React, { useState } from 'react'
import { WHITE, TRANSPARENT, RICH_BLACK, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './Job.module.css'
import { BorderedBox, Button, Forms } from '@platformatic/ui-components'
import { isValidCron } from 'cron-validator'
import cronstrue from 'cronstrue'

const EVERY_HOUR = '0 * * * *'
const EVERY_8_HOURS = '0 */8 * * *'
const EVERY_12_HOURS = '0 */12 * * *'
const EVERY_DAY = '0 0 * * *'

const SUPPORTED_CRONS = [
  EVERY_HOUR,
  EVERY_8_HOURS,
  EVERY_12_HOURS,
  EVERY_DAY
]

function Job ({
  title,
  label,
  cron,
  setFormStatus
}) {
  const [formData, setFormData] = useState({
    schedule: cron
  })
  const [formErrors, setFormErrors] = useState({})
  const [showCustom, setShowCustom] = useState(false)
  const [cronDescription, setCronDescription] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setCronDescription('')

    const isValid = isValidCron(value)

    if (!isValid) {
      setFormErrors(prev => ({
        ...prev,
        schedule: 'Invalid cron expression'
      }))
      setFormStatus(false)
    } else {
      setFormErrors(prev => ({
        ...prev,
        schedule: ''
      }))
      setCronDescription(cronstrue.toString(value))
      setFormStatus(true, value)
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const setSchedule = (schedule) => () => {
    setFormData(prev => ({
      ...prev,
      schedule
    }))
    setFormStatus(true, schedule)
    setShowCustom(false)
  }

  const currentCron = formData.schedule
  const isCustom = currentCron && !SUPPORTED_CRONS.includes(currentCron)
  const customFormInitialValue = isCustom ? currentCron : ''
  let cronDescriptionInitialValue = ''
  if (isCustom && isValidCron(customFormInitialValue)) {
    cronDescriptionInitialValue = cronstrue.toString(customFormInitialValue)
  }

  return (
    <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN}>
      <div className={`${commonStyles.smallFlexCol} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.smallFlexCol} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>{title}</p>
          </div>
          <div className={`${styles.label}`}>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>
              {label}
            </span>
          </div>
        </div>

        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth}  ${styles.actions}`}>
          <Button
            type='button'
            label='Every hour'
            onClick={setSchedule(EVERY_HOUR)}
            color={WHITE}
            backgroundColor={TRANSPARENT}
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
            selected={currentCron === EVERY_HOUR}
          />
          <Button
            type='button'
            label='Every 8 hours'
            onClick={setSchedule(EVERY_8_HOURS)}
            color={WHITE}
            backgroundColor={TRANSPARENT}
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
            selected={currentCron === EVERY_8_HOURS}
          />
          <Button
            type='button'
            label='Every 12 hours'
            onClick={setSchedule(EVERY_12_HOURS)}
            color={WHITE}
            backgroundColor={TRANSPARENT}
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
            selected={currentCron === EVERY_12_HOURS}
          />
          <Button
            type='button'
            label='Every day'
            onClick={setSchedule(EVERY_DAY)}
            color={WHITE}
            backgroundColor={TRANSPARENT}
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
            selected={currentCron === EVERY_DAY}
          />
          <Button
            type='button'
            label='Custom'
            onClick={() => {
              setShowCustom(true)
              setFormData(prev => ({
                ...prev,
                schedule: ''
              }))
              setFormStatus(false, '')
            }}
            color={WHITE}
            backgroundColor={TRANSPARENT}
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
            selected={isCustom}
          />
        </div>
        {(showCustom || isCustom) &&
          <div>
            <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyEnd} ${styles.input}`}>
              <Forms.Input
                name='schedule'
                value={customFormInitialValue}
                onChange={handleChange}
                placeholder='Enter cron expression'
                borderColor={WHITE}
                backgroundColor={RICH_BLACK}
                inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
                errorMessage={formErrors.schedule}
              />

            </div>
            <div className={`${styles.cronDescription}`}>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>
                {cronDescription || cronDescriptionInitialValue}
              </span>
            </div>
          </div>}

      </div>
    </BorderedBox>
  )
}

export default Job
