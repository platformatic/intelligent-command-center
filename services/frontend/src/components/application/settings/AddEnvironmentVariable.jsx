import React from 'react'
import PropTypes from 'prop-types'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './AddEnvironmentVariable.module.css'
import { RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'
import { Button } from '@platformatic/ui-components'
import Forms from '@platformatic/ui-components/src/components/forms'

function AddEnvironmentVariable ({
  showButtonAdd = false,
  onClickAdd = () => {},
  form = { keyName: '', keyValue: '' },
  validations = { keyNameValid: false, keyValueValid: false, formErrors: { keyName: '', keyValue: '' } },
  handleChange = () => {}
}) {
  return (
    <div className={styles.addEnvironmentVariablesRow}>
      <div className={`${styles.tableSmall} ${styles.colSpan4}`}>
        <div className={styles.tableCell}>
          <Forms.Field
            title='Key'
            titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
            required
          >
            <Forms.Input
              placeholder='Enter a new key'
              name='keyName'
              borderColor={WHITE}
              value={form.keyName}
              inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
              backgroundColor={RICH_BLACK}
              onChange={handleChange}
              errorMessage={validations.formErrors.keyName}
              errorMessageTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textErrorRed}`}
              verticalPaddingClassName={styles.inputVerticalPaddingClass}
            />
          </Forms.Field>
        </div>
      </div>
      <div className={`${styles.tableSmall} ${styles.colSpan7}`}>
        <div className={styles.tableCell}>
          <Forms.Field
            title='Value'
            titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
            required
          >
            <Forms.Input
              placeholder='Enter a value'
              name='keyValue'
              borderColor={WHITE}
              value={form.keyValue}
              inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
              backgroundColor={RICH_BLACK}
              onChange={handleChange}
              errorMessage={validations.formErrors.keyValue}
              errorMessageTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textErrorRed}`}
              verticalPaddingClassName={styles.inputVerticalPaddingClass}
            />
          </Forms.Field>
        </div>
      </div>
      <div className={styles.tableSmall}>
        {showButtonAdd && (
          <div className={styles.buttonContainer}>
            <Button
              type='button'
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.smallButtonPadding}
              label='Add'
              onClick={() => onClickAdd()}
              color={WHITE}
              backgroundColor={RICH_BLACK}
            />
          </div>
        )}
      </div>
    </div>
  )
}

AddEnvironmentVariable.propTypes = {
  /**
   * form
    */
  form: PropTypes.shape({
    keyName: PropTypes.string,
    keyValue: PropTypes.string
  }),
  /**
   * validations
    */
  validations: PropTypes.shape({
    keyNameValid: PropTypes.bool,
    keyValueValid: PropTypes.bool,
    formErrors: PropTypes.shape({
      keyName: PropTypes.string,
      keyValue: PropTypes.string
    })
  }),
  /**
   * showButtonAdd
    */
  showButtonAdd: PropTypes.bool,
  /**
   * onClickAdd
    */
  onClickAdd: PropTypes.func,
  /**
   * handleChange
    */
  handleChange: PropTypes.func
}

export default AddEnvironmentVariable
