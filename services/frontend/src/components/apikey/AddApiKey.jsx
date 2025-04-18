import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, DULLS_BACKGROUND_COLOR, RICH_BLACK, POSITION_CENTER, SMALL, MAIN_GREEN, LARGE } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, Button, CopyAndPaste, HorizontalSeparator, LoadingSpinnerV2, PlatformaticIcon } from '@platformatic/ui-components'
import { callApiAddKey } from '~/api'
import styles from './AddApiKey.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import tooltipStyles from '~/styles/TooltipStyles.module.css'
import Forms from '@platformatic/ui-components/src/components/forms'
import Icons from '@platformatic/ui-components/src/components/icons'

function AddApiKey ({
  id,
  onClickCancel = () => {},
  onAddedKey = () => {},
  onError = () => {},
  onClickClose = () => {}
}) {
  const [applicationKey, setApplicationKey] = useState(null)
  const [innerLoading, setInnerLoading] = useState(false)
  const [form, setForm] = useState({ name: '' })
  const [validations, setValidations] = useState({ nameValid: false, formErrors: { name: '' } })
  const [validForm, setValidForm] = useState(false)

  function handleChange (event) {
    const value = event.target.value
    validateField(event.target.name, value, setForm({ name: event.target.value }))
  }

  function validateField (fieldName, fieldValue, callback = () => {}) {
    let tmpValid = validations[`${fieldName}Valid`]
    const formErrors = { ...validations.formErrors }
    tmpValid = fieldValue.length > 0 && /^[a-z]+[\s-_a-z0-9]*$/i.test(fieldValue)
    formErrors[fieldName] = tmpValid ? '' : 'The field is not valid, use only lowercase letters, number and avoid spaces'

    const nextValidation = { ...validations, formErrors }
    nextValidation[`${fieldName}Valid`] = tmpValid
    setValidations(nextValidation)
    validateForm(nextValidation, callback())
  }

  function validateForm (validations, callback = () => {}) {
    // eslint-disable-next-line no-unused-vars
    const { _formErrors, ...restValidations } = validations
    const valid = Object.keys(restValidations).findIndex(element => restValidations[element] === false) === -1
    setValidForm(valid)
    return callback
  }

  async function handleSubmit (event) {
    event.preventDefault()
    try {
      setInnerLoading(true)
      const response = await callApiAddKey(id, form.name)
      setApplicationKey(response.apiSecretsKey)
      onAddedKey()
    } catch (error) {
      console.error(`Error on onClickConfirm ${error}`)
      onError(error)
    } finally {
      setInnerLoading(false)
    }
  }

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Adding Api Key...'
            }]
          }}
          containerClassName={loadingSpinnerStyles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (applicationKey) {
      return (
        <>
          <div className={`${commonStyles.smallFlexBlock} ${commonStyles.itemsCenter}`}>
            <Icons.CircleCheckMarkIcon color={MAIN_GREEN} size={LARGE} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>New API Key added</p>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${typographyStyles.textCenter}`}>
              You successfully added a new API key to your application.
              <br />
              Make sure to copy the new API Key before closing.
            </span>
          </div>
          <div className={`${commonStyles.extraMediumFlexBlock} ${commonStyles.fullWidth}`}>
            <Forms.Field
              title='API Key'
              titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
            >
              <div className={styles.apiKeyContainer}>
                <textarea
                  className={`${styles.textArea} ${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`} readOnly
                  cols='auto'
                  rows={8}
                  value={applicationKey}
                />

                <CopyAndPaste
                  value={applicationKey}
                  tooltipLabel='Api key copied!'
                  color={WHITE}
                  size={SMALL}
                  tooltipClassName={tooltipStyles.tooltipDarkStyle}
                  position={POSITION_CENTER}
                />
              </div>
            </Forms.Field>

            <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />

            <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
              <Button
                label='Close'
                type='button'
                color={RICH_BLACK}
                backgroundColor={WHITE}
                hoverEffect={DULLS_BACKGROUND_COLOR}
                paddingClass={commonStyles.smallButtonPadding}
                textClass={typographyStyles.desktopButtonSmall}
                bordered={false}
                onClick={() => onClickClose()}
              />
            </div>

          </div>
        </>
      )
    }

    return (
      <BorderedBox color={WHITE} borderColorOpacity={OPACITY_30} backgroundColor={TRANSPARENT} classes={styles.detailsLogContainer}>
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>Add API Key</div>
            <PlatformaticIcon iconName='CloseIcon' color={WHITE} size={SMALL} onClick={() => onClickCancel()} />
          </div>
          <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
            <span className={`${typographyStyles.opacity70}`}>To add an API key, you simply have to enter the name of the new API Key.<br />You will not be able to change this name in the future.</span>
          </p>
          <form onSubmit={handleSubmit} className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
            <Forms.Field
              title='API Key Name'
              titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
              required
            >
              <Forms.Input
                placeholder='Enter the name of your API key'
                name='name'
                borderColor={WHITE}
                value={form.name}
                inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
                backgroundColor={RICH_BLACK}
                onChange={handleChange}
              />
            </Forms.Field>
            <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />
            <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
              <Button
                type='button'
                label='Cancel'
                onClick={() => onClickCancel()}
                color={WHITE}
                backgroundColor={TRANSPARENT}
                textClass={typographyStyles.desktopButtonSmall}
                paddingClass={commonStyles.smallButtonPadding}
              />
              <Button
                type='submit'
                textClass={typographyStyles.desktopButtonSmall}
                paddingClass={commonStyles.smallButtonPadding}
                label='Add API Key'
                onClick={handleSubmit}
                color={RICH_BLACK}
                backgroundColor={WHITE}
                hoverEffect={DULLS_BACKGROUND_COLOR}
                bordered={false}
                disabled={!validForm}
              />
            </div>
          </form>
        </div>
      </BorderedBox>
    )
  }

  return (
    <div className={`${styles.addApplicationContainer} ${commonStyles.extraMediumFlexBlock} ${commonStyles.itemsCenter}`}>
      {renderComponent()}
    </div>
  )
}

AddApiKey.propTypes = {
  /**
   * id
   */
  id: PropTypes.string,
  /**
   * onClickCancel
   */
  onClickCancel: PropTypes.func,
  /**
   * onAddedKey
   */
  onAddedKey: PropTypes.func,
  /**
   * onError
   */
  onError: PropTypes.func,
  /**
   * onClickClose
   */
  onClickClose: PropTypes.func
}

export default AddApiKey
