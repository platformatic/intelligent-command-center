import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TableEnvironmentVariables.module.css'
import { LoadingSpinnerV2, Button, HorizontalSeparator } from '@platformatic/ui-components'
import RowEnvironmentVariable from './RowEnvironmentVariable'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import AddEnvironmentVariable from './AddEnvironmentVariable'
import useICCStore from '~/useICCStore'
import { DULLS_BACKGROUND_COLOR, MARGIN_0, RICH_BLACK, TRANSPARENT, WHITE, OPACITY_15 } from '@platformatic/ui-components/src/components/constants'

function TableEnvironmentVariables ({
  environmentVariablesLoaded = false,
  environmentVariables = {},
  readOnlyVariables = true,
  onClickCancel = () => {},
  onClickSave = () => {}
}) {
  const globalState = useICCStore()
  const {
    applicationSelected
  } = globalState
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [formEdited, setFormEdited] = useState([])
  const [formAdded, setFormAdded] = useState([])
  const [validationsEdited, setValidationsEdited] = useState([])
  const [validationsAdded, setValidationsAdded] = useState([])
  const [validFormAdded, setValidFormAdded] = useState(false)
  const [validFormEdited, setValidFormEdited] = useState(true)

  useEffect(() => {
    if (environmentVariablesLoaded) {
      if (Object.keys(environmentVariables).length === 0) {
        setShowNoResult(true)
      } else {
        setShowNoResult(false)
        const tmpForm = []
        const tmpValidation = []
        Object.keys(environmentVariables).forEach(key => {
          tmpForm.push({ keyName: key, keyValue: environmentVariables[key] })
          tmpValidation.push({ keyNameValid: true, keyValueValid: true, formErrors: { keyName: '', keyValue: '' } })
        })
        setFormEdited(tmpForm)
        if (tmpForm.length > 0) {
          setValidFormAdded(true)
        }
        setValidationsEdited(tmpValidation)
      }
      setInnerLoading(false)
    } else {
      setInnerLoading(true)
    }
  }, [environmentVariablesLoaded, Object.keys(environmentVariables).length])

  useEffect(() => {
    if (!readOnlyVariables) {
      handleAddNewSecretRow()
    } else {
      setFormAdded([])
      setValidationsAdded([])
    }
  }, [readOnlyVariables])

  function handleAddNewSecretRow () {
    setFormAdded(oldForm => [...oldForm, { keyName: '', keyValue: '', markAsDeleted: false }])
    setValidationsAdded(oldValidation => [...oldValidation, { keyNameValid: false, keyValueValid: false, formErrors: { keyName: '', keyValue: '' } }])
  }

  function handleCheckForms () {
    const found = formAdded.find(form => form.keyValue !== '' || form.keyName !== '') !== undefined
    return onClickCancel(found || (formEdited.find(form => form.markAsDeleted) !== undefined))
  }

  function handleFormEditedChange (event, indexValidations) {
    const value = event.target.value
    validateFieldsFormEdited(event.target.name, value, indexValidations, () => {
      const nextForm = formEdited.map((form, i) => {
        if (i === indexValidations) {
          return { ...form, [event.target.name]: value }
        } else {
          return form
        }
      })
      setFormEdited(nextForm)
    })
  }

  function handleFormMarkAsDeleted (value, indexValidations) {
    const nextForm = formEdited.map((form, i) => {
      if (i === indexValidations) {
        return { ...form, markAsDeleted: value }
      } else {
        return form
      }
    })
    setFormEdited(nextForm)
  }

  function handleFormAddedChange (event, indexValidations) {
    const value = event.target.value
    validateFieldsFormAdded(event.target.name, value, indexValidations, () => {
      const nextForm = formAdded.map((form, i) => {
        if (i === indexValidations) {
          return { ...form, [event.target.name]: value }
        } else {
          return form
        }
      })
      setFormAdded(nextForm)
    })
  }

  function validateFieldsFormEdited (fieldName, fieldValue, indexValidations, callback = () => {}) {
    const validations = validationsEdited[indexValidations]
    let tmpValid = validations[`${fieldName}Valid`]
    const formErrors = { ...validations.formErrors }
    tmpValid = fieldValue.length > 0
    formErrors[fieldName] = fieldValue.length > 0 ? (tmpValid ? '' : 'The field is not valid, make sure you are using regular characters') : ''
    const nextValidation = { ...validations, formErrors }
    nextValidation[`${fieldName}Valid`] = tmpValid
    const nextValidations = validationsAdded.map((validation, i) => {
      if (i === indexValidations) {
        return nextValidation
      } else {
        return validation
      }
    })
    setValidationsEdited(nextValidations)
    validateForm(nextValidations, 'edited', callback())
  }

  function validateFieldsFormAdded (fieldName, fieldValue, indexValidations, callback = () => {}) {
    const validations = validationsAdded[indexValidations]
    let tmpValid = validations[`${fieldName}Valid`]
    const formErrors = { ...validations.formErrors }
    tmpValid = fieldValue.length > 0
    formErrors[fieldName] = fieldValue.length > 0 ? (tmpValid ? '' : 'The field is not valid, make sure you are using regular characters') : ''
    const nextValidation = { ...validations, formErrors }
    nextValidation[`${fieldName}Valid`] = tmpValid
    const nextValidations = validationsAdded.map((validation, i) => {
      if (i === indexValidations) {
        return nextValidation
      } else {
        return validation
      }
    })
    setValidationsAdded(nextValidations)
    validateForm(nextValidations, 'added', callback())
  }

  function validateForm (validations, whichForm, callback = () => {}) {
    // eslint-disable-next-line no-unused-vars
    const invalid = validations.find(validation => {
      const { _formErrors, ...restValidations } = validation
      const found = Object.keys(restValidations).findIndex(element => restValidations[element] === false)
      return found !== -1
    })

    whichForm === 'added' ? setValidFormAdded(!invalid) : setValidFormEdited(!invalid)
    return callback
  }

  function handleClickSave () {
    const payload = {}
    formEdited.filter(form => !form.markAsDeleted).forEach(form => {
      payload[form.keyName] = form.keyValue
    })
    formAdded.filter(form => form.keyName !== '').forEach(form => {
      payload[form.keyName] = form.keyValue
    })
    onClickSave(payload)
  }

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading={innerLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading your Environment Variables...'
            }, {
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
              text: 'This process will just take a few seconds.'
            }]
          }}
          containerClassName={styles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }
    if (showNoResult) { return <NoDataAvailable iconName='EnvVariableszIcon' title='There are no Secrets for this Application' containerClassName={styles.noDataContainer} /> }

    return (
      <div className={styles.contentTableEnvironmentVariables}>
        <div className={styles.tableEnvironmentVariables}>
          <div className={styles.tableHeaders}>
            <div className={`${styles.tableHeader} ${styles.colSpan4}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Key</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${styles.colSpan4}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Value</span>
              </div>
            </div>
          </div>

          {formEdited.map((form, index) => (
            <RowEnvironmentVariable
              applicationId={applicationSelected.id}
              key={`${form.keyName}-${index}-${new Date().toISOString()}`}
              form={form}
              validations={validationsEdited[index]}
              handleChange={(event) => handleFormEditedChange(event, index)}
              readOnlyVariables={readOnlyVariables}
              onClickMarkAsDeleted={(value) => handleFormMarkAsDeleted(value, index)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.containerTableEnvironmentVariables}>
      {renderComponent()}
      {!readOnlyVariables && (
        <>
          {formAdded.map((form, index) => (
            <AddEnvironmentVariable
              showButtonAdd={index === formAdded.length - 1}
              onClickAdd={() => handleAddNewSecretRow()}
              applicationId={applicationSelected.id}
              key={index}
              form={form}
              validations={validationsAdded[index]}
              handleChange={(event) => handleFormAddedChange(event, index)}
            />
          ))}
          <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_15} />
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <Button
              type='button'
              label='Cancel'
              onClick={() => handleCheckForms()}
              color={WHITE}
              backgroundColor={TRANSPARENT}
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.smallButtonPadding}
            />
            <Button
              type='button'
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.smallButtonPadding}
              label='Save'
              color={RICH_BLACK}
              backgroundColor={WHITE}
              hoverEffect={DULLS_BACKGROUND_COLOR}
              disabled={!(validFormEdited && validFormAdded)}
              bordered={false}
              onClick={() => handleClickSave()}
            />
          </div>
        </>
      )}
    </div>
  )
}

TableEnvironmentVariables.propTypes = {
  /**
   * environmentVariablesLoaded
    */
  environmentVariablesLoaded: PropTypes.bool,
  /**
   * environmentVariables
    */
  environmentVariables: PropTypes.object,
  /**
   * readOnlyVariables
    */
  readOnlyVariables: PropTypes.bool,
  /**
   * onClickCancel
    */
  onClickCancel: PropTypes.func,
  /**
   * onClickSave
    */
  onClickSave: PropTypes.func
}

export default TableEnvironmentVariables
