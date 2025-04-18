import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, DULLS_BACKGROUND_COLOR, RICH_BLACK } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, HorizontalSeparator } from '@platformatic/ui-components'
import Forms from '@platformatic/ui-components/src/components/forms'

function ImportEnvironment ({
  onClickCancel = () => {},
  onClickConfirm = () => {}
}) {
  const [validations, setValidations] = useState({ fileValid: false, formErrors: { file: '' } })
  const [validForm, setValidForm] = useState(false)
  const [file, setFile] = useState(null)
  const [imported, setImported] = useState(false)
  const EXTENSION_FILE_TAR = '.tar'

  function handleConfirm () {
    onClickConfirm(file)
  }
  function handleImport () {
    setImported(true)
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
    if (file.name.includes(EXTENSION_FILE_TAR)) {
      validateField('file', true, () => {})
      setFile(file)
    } else {
      validateField('file', false, () => {})
      setFile(null)
    }
  }

  return (
    <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
      {imported
        ? (
          <>
            <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
              <span className={`${typographyStyles.opacity70}`}>
                You are about to import the file {file.name} as to be use as new environment. Are you sure you want to proceed?
                <br />
                <br />
                This action will overwrite your existing environment. Are you sure you want proceed?
              </span>
            </p>
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
                paddingClass={commonStyles.smallButtonPadding}
                label='Confirm'
                onClick={() => handleConfirm()}
                color={RICH_BLACK}
                backgroundColor={WHITE}
                hoverEffect={DULLS_BACKGROUND_COLOR}
                bordered={false}
                disabled={!validForm}
              />
            </div>
          </>
          )
        : (
          <>
            <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
              <span className={`${typographyStyles.opacity70}`}>To import an environment select the file you want to import.</span>
            </p>
            <Forms.InputFileUpload
              idInputFile='fileUploadTar'
              placeholder='Select .tar file'
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
              acceptFiles={EXTENSION_FILE_TAR}
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
                paddingClass={commonStyles.smallButtonPadding}
                label='Import'
                onClick={() => handleImport()}
                color={RICH_BLACK}
                backgroundColor={WHITE}
                hoverEffect={DULLS_BACKGROUND_COLOR}
                bordered={false}
                disabled={!validForm}
              />
            </div>
          </>
          )}
    </div>
  )
}

ImportEnvironment.propTypes = {
  /**
   * onClickCancel
   */
  onClickCancel: PropTypes.func,
  /**
   * onClickRemove
   */
  onClickConfirm: PropTypes.func
}

export default ImportEnvironment
