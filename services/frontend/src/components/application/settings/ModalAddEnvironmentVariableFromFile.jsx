import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, DULLS_BACKGROUND_COLOR, RICH_BLACK } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, HorizontalSeparator } from '@platformatic/ui-components'
import Forms from '@platformatic/ui-components/src/components/forms'

function ModalAddEnvironmentVariableFromFile ({
  onClickCancel = () => {},
  onClickConfirm = () => {}
}) {
  const [validations, setValidations] = useState({ fileValid: false, formErrors: { file: '' } })
  const [validForm, setValidForm] = useState(false)
  const [environmentVariables, setEnvironmentVariables] = useState([])

  function handleUpload () {
    onClickConfirm(environmentVariables)
  }

  function validateField (fieldName, fieldValue, callback = () => {}) {
    let tmpValid = validations[`${fieldName}Valid`]
    const formErrors = { ...validations.formErrors }
    switch (fieldName) {
      case 'file':
        tmpValid = fieldValue
        formErrors[fieldName] = tmpValid ? '' : 'The field is not a valid .env file'
        break
      default:
        break
    }

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

  function handleSelectFile (file) {
    if (file.name.includes('.env')) {
      validateField('file', true, () => {})
      // eslint-disable-next-line no-undef
      const reader = new FileReader()
      reader.onload = function (e) {
        const elements = e.target.result.split(/\r?\n/)
        const variables = elements.map(element => ({ label: element.split('=')[0], value: element.split('=')[1] })).filter(element => (element.label !== '' && !element.label.startsWith('#') && element.value !== undefined))
        setEnvironmentVariables(variables)
      }
      reader.readAsText(file)
    } else {
      validateField('file', false, () => {})
    }
  }

  return (
    <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
      <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
        <span className={`${typographyStyles.opacity70}`}>Upload a .env file with application variables.</span>
      </p>
      <Forms.InputFileUpload
        idInputFile='fileUploadAddApplication'
        placeholder='/path-example/foo'
        borderColor={WHITE}
        inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
        backgroundColor={RICH_BLACK}
        onFileSelect={handleSelectFile}
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
        showDetailButton={false}
        verticalPaddingClassName={commonStyles.inputVerticalPaddingClassFontDesktopBodySmall}
      />
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
          type='button'
          textClass={typographyStyles.desktopButtonSmall}
          paddingClass={commonStyles.buttonPadding}
          label='Upload'
          onClick={() => handleUpload()}
          color={RICH_BLACK}
          backgroundColor={WHITE}
          hoverEffect={DULLS_BACKGROUND_COLOR}
          bordered={false}
          disabled={!validForm}
        />
      </div>
    </div>
  )
}

ModalAddEnvironmentVariableFromFile.propTypes = {
  /**
   * onClickCancel
   */
  onClickCancel: PropTypes.func,
  /**
   * onClickRemove
   */
  onClickConfirm: PropTypes.func
}

export default ModalAddEnvironmentVariableFromFile
