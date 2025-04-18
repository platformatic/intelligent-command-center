import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { MARGIN_0, OPACITY_15, WHITE, RICH_BLACK, LARGE, DULLS_BACKGROUND_COLOR, SMALL, POSITION_CENTER, MAIN_GREEN, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import tooltipStyles from '~/styles/TooltipStyles.module.css'
import { Button, CopyAndPaste, HorizontalSeparator, LoadingSpinnerV2, ModalDirectional } from '@platformatic/ui-components'
import Forms from '@platformatic/ui-components/src/components/forms'
import Icons from '@platformatic/ui-components/src/components/icons'
import styles from './AddApplication.module.css'
import { getAfterIcon } from '~/utilityValidations'
import { addApiApplication } from '~/api'
import PanelEnvironmentVariables from './PanelEnvironmentVariables'
import { pathRegExp } from '../../utils'

function AddApplication ({
  onSuccessFullApplicationAdded = () => {},
  onClickCloseApplication = () => {},
  onError = () => {}
}) {
  const [form, setForm] = useState({ path: '', name: '' })
  const [validations, setValidations] = useState({ nameValid: false, pathValid: false, fileValid: false, formErrors: { path: '', name: '', file: '' } })
  const [validForm, setValidForm] = useState(false)
  const [pathAlreadyChanged, setPathAlreadyChanged] = useState(false)
  const [applicationKey, setApplicationKey] = useState(null)
  const [innerLoading, setInnerLoading] = useState(false)
  const [showPanelEnvironmentVariables, setShowPanelEnvironmentVariables] = useState(false)
  const [environmentVariables, setEnvironmentVariables] = useState([])
  const [filename, setFilename] = useState('')

  function handleChangePath (event) {
    if (!pathAlreadyChanged) {
      setPathAlreadyChanged(true)
    }
    handleChange(event)
  }

  function handleChange (event) {
    const value = event.target.value
    if (event.target.name === 'name' && pathAlreadyChanged === false) {
      let pathValue = value !== '' ? `/${value}/` : ''
      pathValue = pathValue.replace(/\/\/$/, '/')
      validateFields([
        { fieldName: 'name', fieldValue: value },
        { fieldName: 'path', fieldValue: pathValue }
      ], setForm(form => ({ path: pathValue, name: value })))
    } else {
      validateField(event.target.name, value, setForm(form => ({ ...form, [event.target.name]: value })))
    }
  }

  function handleSelectFile (file) {
    if (file?.name?.includes('.env')) {
      validateFileField(true, false, setForm(form => ({ ...form, file: true })))
      setFilename(file.name)
      // eslint-disable-next-line no-undef
      const reader = new FileReader()
      reader.onload = function (e) {
        const elements = e.target.result.split(/\r?\n/)
        const variables = elements.map(element => ({ label: element.split('=')[0], value: element.split('=')[1], include: true })).filter(element => (element.label !== '' && !element.label.startsWith('#') && element.value !== undefined))
        setEnvironmentVariables(variables)
      }
      reader.readAsText(file)
    } else {
      validateFileField(false, file !== null, setForm(form => ({ ...form, file: false })))
    }
  }

  async function handleSubmit (event) {
    event.preventDefault()
    try {
      setInnerLoading(true)

      const envVar = environmentVariables.filter(element => element.include).reduce((acc, current) => {
        acc[current.label] = current.value
        return acc
      }, {})

      const response = await addApiApplication(form.name, form.path, envVar)
      setApplicationKey(response.apiSecretsKey)
      onSuccessFullApplicationAdded()
    } catch (error) {
      console.error(`Error on handleConfirmAddApplication ${error}`)
      onError(error)
    } finally {
      setInnerLoading(false)
    }
  }

  function validateFields (fields, callback = () => {}) {
    let tmpValid
    const formErrors = { ...validations.formErrors }
    const nextValidation = { ...validations, formErrors }

    fields.forEach(field => {
      const { fieldName, fieldValue } = field
      tmpValid = validations[`${fieldName}Valid`]

      switch (fieldName) {
        case 'path':
          tmpValid = fieldValue.length > 0 && pathRegExp.test(fieldValue)
          formErrors[fieldName] = tmpValid ? '' : 'The field is not valid path'
          break
        default:
          tmpValid = fieldValue.length > 0 && /^[a-z]+[-_a-z0-9]*$/i.test(fieldValue)
          formErrors[fieldName] = tmpValid ? '' : 'The field is not valid, use only lowercase letters, number and avoid spaces'
          break
      }
      nextValidation[`${fieldName}Valid`] = tmpValid
    })
    setValidations(nextValidation)
    validateForm(nextValidation, callback())
  }

  function validateField (fieldName, fieldValue, callback = () => {}) {
    let tmpValid = validations[`${fieldName}Valid`]
    const formErrors = { ...validations.formErrors }
    switch (fieldName) {
      case 'path':
        tmpValid = fieldValue.length > 0 && pathRegExp.test(fieldValue)
        formErrors[fieldName] = tmpValid ? '' : 'The field is not valid path'
        break
      case 'file':
        tmpValid = fieldValue
        formErrors[fieldName] = tmpValid ? '' : 'The field is not a valid .env file'
        break
      default:
        tmpValid = fieldValue.length > 0 && /^[a-z]+[-_a-z0-9]*$/i.test(fieldValue)
        formErrors[fieldName] = tmpValid ? '' : 'The field is not valid, use only lowercase letters, number and avoid spaces'
        break
    }

    const nextValidation = { ...validations, formErrors }
    nextValidation[`${fieldName}Valid`] = tmpValid
    setValidations(nextValidation)
    validateForm(nextValidation, callback())
  }

  function validateFileField (fieldValue, showErrorMessage, callback = () => {}) {
    const fieldName = 'file'
    let tmpValid = validations[`${fieldName}Valid`]
    const formErrors = { ...validations.formErrors }
    tmpValid = fieldValue
    formErrors[fieldName] = showErrorMessage ? 'The field is not a valid .env file' : ''

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

  function onClickCheckDocumentation () {
    window.open(
      'https://docs.platformatichq.com/docs/basic-usage/deploy',
      '_blank'
    )
  }

  function changeIncludeOnEnvironmentVariables (value) {
    setEnvironmentVariables(environmentVariables.map(env => ({ ...env, include: value })))
  }

  function getCommandLine () {
    return `tug apps deploy -a ${form.name} --ci=github --icc-url=https://icc.plt --api-key=${applicationKey}`
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
              text: 'Adding application ...'
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
            <div className={`${commonStyles.flexBlockNoGap} ${commonStyles.itemsCenter}`}>
              <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Application Added</p>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${typographyStyles.textCenter}`}>The application has been added successfully. Make sure to <br />copy the API key before closing.</span>
            </div>
          </div>
          <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
            <Forms.Field
              title='API Key'
              titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
            >
              <div className={styles.apiKeyContainer}>
                <textarea
                  className={`${styles.textArea} ${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`} readOnly
                  cols='auto'
                  rows={7}
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

            <Forms.Field
              title='Deploy from CI'
              titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
              helper='Use the following command to deploy from your CI.'
              helperClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}
            >
              <div className={styles.apiKeyContainer}>
                <textarea
                  className={`${styles.textArea} ${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`} readOnly
                  cols='auto'
                  rows={9}
                  value={getCommandLine()}
                />
                <CopyAndPaste
                  value={getCommandLine()}
                  tooltipLabel='Command Line copied!'
                  color={WHITE}
                  size={SMALL}
                  tooltipClassName={tooltipStyles.tooltipDarkStyle}
                  position={POSITION_CENTER}
                />
              </div>
            </Forms.Field>

            <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_15} />

            <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
              <Button
                label='Done'
                type='button'
                color={RICH_BLACK}
                backgroundColor={WHITE}
                hoverEffect={DULLS_BACKGROUND_COLOR}
                paddingClass={commonStyles.smallButtonPadding}
                textClass={typographyStyles.desktopButtonSmall}
                bordered={false}
                onClick={() => onClickCloseApplication()}
              />
            </div>

            <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${typographyStyles.textCenter} ${commonStyles.fullWidth}`}>Do you want to deploy from your machine? <span className={`${commonStyles.cursorPointer} ${typographyStyles.textTertiaryBlue}`} onClick={() => onClickCheckDocumentation()}>Use our documentation</span></p>

          </div>
        </>
      )
    }

    return (
      <>
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.itemsCenter}`}>
          <Icons.CreateAppIcon color={WHITE} size={LARGE} />
          <div className={`${commonStyles.flexBlockNoGap} ${commonStyles.itemsCenter}`}>
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Add Application</p>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${typographyStyles.textCenter}`}>Name you app and set its path.</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
          <Forms.Field
            title='App name'
            titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
            helper='Use only letters, numbers and dash.'
            helperClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}
            required
          >
            <Forms.Input
              placeholder='Application-name-example'
              name='name'
              borderColor={WHITE}
              value={form.name}
              inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
              backgroundColor={RICH_BLACK}
              onChange={handleChange}
              errorMessage={validations.formErrors.name}
              errorMessageTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textErrorRed}`}
              afterIcon={getAfterIcon(form.name, validations.formErrors.name)}
              verticalPaddingClassName={commonStyles.inputVerticalPaddingClassFontDesktopBodySmall}
            />
          </Forms.Field>

          <Forms.Field
            title='App Path'
            titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
            required
          >
            <Forms.Input
              placeholder='/path-example/foo/'
              name='path'
              borderColor={WHITE}
              value={`${form.path}`}
              inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
              backgroundColor={RICH_BLACK}
              onChange={handleChangePath}
              errorMessage={validations.formErrors.path}
              errorMessageTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textErrorRed}`}
              afterIcon={getAfterIcon(form.path, validations.formErrors.path)}
              verticalPaddingClassName={commonStyles.inputVerticalPaddingClassFontDesktopBodySmall}
            />
          </Forms.Field>

          <Forms.Field
            title='Environment variables'
            titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
            helper='Upload a .env file with application variables, our follow our documentation to create them manually.'
            helperClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}
            required
          >
            <Forms.InputFileUpload
              idInputFile='fileUploadAddApplication'
              placeholder='Select .env file'
              borderColor={WHITE}
              inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
              backgroundColor={RICH_BLACK}
              onFileSelect={handleSelectFile}
              onClickDetail={() => setShowPanelEnvironmentVariables(true)}
              errorMessage={validations.formErrors.file}
              errorMessageTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textErrorRed}`}
              beforeIcon={{
                iconName: 'UploadFileIcon',
                color: WHITE,
                onClick: null
              }}
              removeFileButton={{
                textClass: `${typographyStyles.desktopButtonSmall} ${typographyStyles.textErrorRed}`,
                paddingClass: commonStyles.smallButtonPadding
              }}
              detailFileButton={{
                textClass: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
                paddingClass: commonStyles.smallButtonPadding
              }}
              verticalPaddingClassName={commonStyles.inputVerticalPaddingClassFontDesktopBodySmall}
            />
          </Forms.Field>

          <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_15} />

          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
            <Button
              type='button'
              label='Cancel'
              onClick={() => onClickCloseApplication()}
              color={WHITE}
              backgroundColor={TRANSPARENT}
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.smallButtonPadding}
            />
            <Button
              label='Add Application'
              type='submit'
              color={RICH_BLACK}
              backgroundColor={WHITE}
              hoverEffect={DULLS_BACKGROUND_COLOR}
              paddingClass={commonStyles.smallButtonPaddingForNoBordered}
              textClass={typographyStyles.desktopButtonSmall}
              bordered={false}
              disabled={!validForm}
            />
          </div>
        </form>
      </>
    )
  }

  return (
    <>
      <div className={`${styles.addApplicationContainer} ${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`}>
        {renderComponent()}
      </div>
      {showPanelEnvironmentVariables && (
        <ModalDirectional
          key='modalAddApplicationEnvVariables'
          setIsOpen={() => setShowPanelEnvironmentVariables(false)}
          classNameModalLefty={styles.modalLeftyAddApplication}
          smallLayout
          permanent
          blurClassName={styles.blurPanelEnvironmentVariables}
        >
          <PanelEnvironmentVariables key='panel-env-var' environmentVariables={environmentVariables} filename={filename} onClickSetAllEnvironmentVariable={(value) => changeIncludeOnEnvironmentVariables(value)} />
        </ModalDirectional>
      )}
    </>
  )
}

AddApplication.propTypes = {
  /**
   * onSuccessFullApplicationAdded
   */
  onSuccessFullApplicationAdded: PropTypes.func,
  /**
   * onClickCloseApplication
   */
  onClickCloseApplication: PropTypes.func,
  /**
   * onError
   */
  onError: PropTypes.func
}

export default AddApplication
