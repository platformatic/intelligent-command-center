import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, RICH_BLACK, DULLS_BACKGROUND_COLOR } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, HorizontalSeparator } from '@platformatic/ui-components'
import Forms from '@platformatic/ui-components/src/components/forms'
import { pathRegExp } from '../../utils'
function AddPath ({
  name,
  onClickCancel = () => {},
  onClickConfirm = () => {}
}) {
  const [form, setForm] = useState({ path: `/${name}` })
  const [updating, setUpdating] = useState(false)
  const [validations, setValidations] = useState({ pathValid: true, formErrors: { path: '' } })
  const [validForm, setValidForm] = useState(true)

  function handleChange (event) {
    const value = event.target.value
    validateField(event.target.name, value, setForm(form => ({ ...form, [event.target.name]: value })))
  }

  async function handleSubmit (event) {
    event.preventDefault()
    if (validForm) {
      onClickConfirm(form.path)
      setUpdating(true)
    }
  }

  function validateField (fieldName, fieldValue, callback = () => {}) {
    let tmpValid = validations[`${fieldName}Valid`]
    const formErrors = { ...validations.formErrors }
    switch (fieldName) {
      case 'path':
        tmpValid = fieldValue.length > 0 && pathRegExp.test(fieldValue)
        formErrors[fieldName] = tmpValid ? '' : 'The field is not valid path'
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

  return (
    <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
      <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
        <span className={`${typographyStyles.opacity70}`}>You are about to add a path to your application </span>{name}<span className={`${typographyStyles.opacity70}`}>.</span>
      </p>

      <form onSubmit={handleSubmit} className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        <Forms.Field
          title='Add Path'
          titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
          helper='Enter or paste the desire path for your application'
          helperClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}
        >
          <Forms.Input
            placeholder='/path-example/foo'
            name='path'
            borderColor={WHITE}
            value={form.path}
            inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
            backgroundColor={RICH_BLACK}
            onChange={handleChange}
            errorMessage={validations.formErrors.path}
            errorMessageTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textErrorRed}`}
            verticalPaddingClassName={commonStyles.inputVerticalPaddingClassFontDesktopBodySmall}
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
            label={updating ? 'Adding...' : 'Add path'}
            onClick={handleSubmit}
            color={RICH_BLACK}
            backgroundColor={WHITE}
            hoverEffect={DULLS_BACKGROUND_COLOR}
            disabled={!validForm || updating}
            bordered={false}
          />
        </div>
      </form>
    </div>
  )
}

AddPath.propTypes = {
  /**
   * name
    */
  name: PropTypes.string.isRequired,
  /**
   * onClickEdit
   */
  onClickCancel: PropTypes.func,
  /**
   * onClickRemove
   */
  onClickConfirm: PropTypes.func
}

export default AddPath
