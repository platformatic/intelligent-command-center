import React, { useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './SettingsPreview.module.css'
import { BorderedBox, Button, CopyAndPaste, Modal } from '@platformatic/ui-components'
import Forms from '@platformatic/ui-components/src/components/forms'
import { ERROR_RED, MODAL_POPUP_V2, RICH_BLACK, SMALL, TRANSPARENT, WHITE, OPACITY_10, POSITION_CENTER } from '@platformatic/ui-components/src/components/constants'
import tooltipStyles from '~/styles/TooltipStyles.module.css'
import ClosePreview from './ClosePreview'
import SuccessComponent from '~/components/success/SuccessComponent'
import {
  callApiClosePreview,
  getApiTaxonomySecrets
} from '~/api'
import ErrorComponent from '~/components/errors/ErrorComponent'
import { getAfterIconOnEdit } from '~/utilityValidations'
import { useNavigate } from 'react-router-dom'
import { PREVIEWS_PATH } from '~/ui-constants'

function SettingsPreview ({ taxonomyName, taxonomyId, open = true }) {
  const [showModalClosePreview, setShowModalClosePreview] = useState(false)
  const [showSuccessComponent, setShowSuccessComponent] = useState(false)
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [environmentVariablesLoaded, setEnvironmentVariablesLoaded] = useState(false)
  const [environmentVariables, setEnvironmentVariables] = useState({})
  const [form, setForm] = useState({ name: taxonomyName })
  const [validations, setValidations] = useState({ nameValid: false, formErrors: { name: '' } })
  // eslint-disable-next-line no-unused-vars
  const [validForm, setValidForm] = useState(false)
  const navigate = useNavigate()

  if (taxonomyId && !environmentVariablesLoaded) {
    async function loadEnvironmentVariables () {
      try {
        const environmentVariables = await getApiTaxonomySecrets(taxonomyId)
        setEnvironmentVariables(environmentVariables)
        setEnvironmentVariablesLoaded(true)
      } catch (error) {
        console.error(`Error on getDetailPRS ${error}`)
        setError(error)
        setShowErrorComponent(true)
      }
    }
    loadEnvironmentVariables()
  }

  async function handleConfirmClosePreview () {
    try {
      await callApiClosePreview(taxonomyId)
      setShowSuccessComponent(true)
      setTimeout(() => {
        setShowSuccessComponent(false)
        navigate(PREVIEWS_PATH)
      }, 3000)
    } catch (error) {
      setError(error)
      setShowErrorComponent(true)
    } finally {
      setShowModalClosePreview(false)
    }
  }

  function handleCloseModalClosePreview () {
    setShowModalClosePreview(false)
  }

  function handleChange (event) {
    const value = event.target.value
    validateField(event.target.name, value, setForm({ name: event.target.value }))
  }

  function validateField (fieldName, fieldValue, callback = () => {}) {
    let tmpValid = validations[`${fieldName}Valid`]
    const formErrors = { ...validations.formErrors }
    tmpValid = fieldValue.length > 0 && /^[a-z]+[-_a-z0-9]*$/i.test(fieldValue)
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

  function renderEnvVariable (key) {
    return (
      <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth}`} key={key}>
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
          <Forms.Field
            title='Key Name'
            titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
          >
            <Forms.Input
              name='key'
              borderColor={WHITE}
              value={key}
              inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
              backgroundColor={RICH_BLACK}
              readOnly
              verticalPaddingClassName={commonStyles.inputVerticalPaddingClassFontDesktopBodySmall}
            />
          </Forms.Field>
        </div>
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
          <Forms.Field
            title='Key value'
            titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
          >
            <Forms.Input
              name='value'
              borderColor={WHITE}
              value='*********************************'
              inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
              backgroundColor={RICH_BLACK}
              readOnly
              verticalPaddingClassName={commonStyles.inputVerticalPaddingClassFontDesktopBodySmall}
            />
          </Forms.Field>
        </div>
      </div>
    )
  }

  if (showErrorComponent) {
    return <ErrorComponent error={error} onClickDismiss={() => setShowErrorComponent(false)} />
  }

  return (
    <>
      <div className={`${commonStyles.extraMediumFlexBlock} ${commonStyles.fullWidth}`}>

        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
            <Forms.Field
              title='Preview name'
              titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
            >
              <Forms.Input
                name='name'
                borderColor={WHITE}
                value={form.name}
                inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
                backgroundColor={RICH_BLACK}
                onChange={handleChange}
                readOnly
                afterIcon={getAfterIconOnEdit(form.name, validations.formErrors.name, null)}
                verticalPaddingClassName={commonStyles.inputVerticalPaddingClassFontDesktopBodySmall}
              />
            </Forms.Field>
          </div>
          <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
            <Forms.Field
              title='Preview Environment ID'
              titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
            >
              <div className={styles.boxBorderedInput}>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{taxonomyId}</span>
                <CopyAndPaste
                  value={taxonomyId}
                  tooltipLabel='Value copied!'
                  color={WHITE}
                  size={SMALL}
                  tooltipClassName={tooltipStyles.tooltipDarkStyle}
                  position={POSITION_CENTER}
                  tooltipFixed
                />
              </div>
            </Forms.Field>
          </div>
        </div>

        {Object.keys(environmentVariables).map(key => renderEnvVariable(key, environmentVariables[key]))}

        {open && (
          <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
            <p
              className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textErrorRed}`}
              title='Danger Zone'
            >
              Danger Zone
            </p>
            <BorderedBox backgroundColor={ERROR_RED} backgroundColorOpacity={OPACITY_10} color={TRANSPARENT} classes={`${commonStyles.mediumFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} `}>
              <div className={`${commonStyles.flexBlockNoGap}`}>
                <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textErrorRed}`}>Close preview</span>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} `}>Once you close the preview, there is no going back.</span>
              </div>
              <Button
                textClass={typographyStyles.desktopButtonSmall}
                paddingClass={commonStyles.smallButtonPadding}
                label='Close Preview'
                color={ERROR_RED}
                type='button'
                onClick={() => setShowModalClosePreview(true)}
              />
            </BorderedBox>
          </div>
        )}
      </div>
      {showModalClosePreview && (
        <Modal
          key='modalClosePreview'
          setIsOpen={() => handleCloseModalClosePreview()}
          title='Close Preview'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <ClosePreview
            onClickCancel={() => handleCloseModalClosePreview()}
            onClickConfirm={() => handleConfirmClosePreview()}
          />
        </Modal>
      )}
      {showSuccessComponent && (
        <SuccessComponent
          title='Environment Closed'
          subtitle='You successfully close the Environment'
        />
      )}
    </>
  )
}

SettingsPreview.propTypes = {
  /**
   * taxonomyName
   */
  taxonomyName: PropTypes.string,
  /**
   * taxonomyId
   */
  taxonomyId: PropTypes.string,
  /**
   * open
   */
  open: PropTypes.bool
}

export default SettingsPreview
