import React from 'react'
import PropTypes from 'prop-types'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './RowEnvironmentVariable.module.css'
import { Button } from '@platformatic/ui-components'
import { ERROR_RED, RICH_BLACK, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'

function RowEnvironmentVariable ({
  readOnlyVariables = true,
  form = { keyName: '', keyValue: '', markAsDeleted: false },
  validations = { keyNameValid: false, keyValueValid: false, formErrors: { keyName: '', keyValue: '' } },
  handleChange = () => {},
  onClickMarkAsDeleted = () => {}
}) {
  return (
    <div className={styles.environmentVariablesRow}>
      <div className={`${styles.tableSmall} ${styles.colSpan4}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Key</span>
        </div>
        <div className={styles.tableCell}>
          <div className={`${styles.customSmallFlexRow}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${form.markAsDeleted ? typographyStyles.opacity30 : ''}`}>{form.keyName}</span>
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmall} ${styles.colSpan7}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.ellipsis}`}>Value</span>
        </div>
        <div className={styles.tableCell}>
          <div className={`${styles.customSmallFlexRow}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${form.markAsDeleted ? typographyStyles.opacity30 : ''}`}>******************************************</span>
          </div>
        </div>
      </div>
      {!readOnlyVariables && (
        <div className={styles.tableSmall}>
          <div className={styles.tableCell}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.ellipsis}`}>Actions</span>
          </div>
          <div className={styles.tableCell}>
            <div className={styles.buttonContainer}>
              {form.markAsDeleted
                ? (
                  <Button
                    type='button'
                    textClass={typographyStyles.desktopButtonSmall}
                    paddingClass={commonStyles.smallButtonPadding}
                    label='Restore'
                    onClick={() => onClickMarkAsDeleted(false)}
                    color={WHITE}
                    backgroundColor={RICH_BLACK}
                    platformaticIcon={{ iconName: 'RestartIcon', size: SMALL, color: WHITE }}
                    fullWidth
                  />
                  )
                : (
                  <Button
                    type='button'
                    textClass={typographyStyles.desktopButtonSmall}
                    paddingClass={commonStyles.smallButtonPadding}
                    label='Delete'
                    onClick={() => onClickMarkAsDeleted(true)}
                    color={ERROR_RED}
                    backgroundColor={RICH_BLACK}
                    platformaticIcon={{ iconName: 'TrashIcon', size: SMALL, color: ERROR_RED }}
                    fullWidth
                  />
                  )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

RowEnvironmentVariable.propTypes = {
  /**
   * readOnlyVariables
    */
  readOnlyVariables: PropTypes.bool,
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
   * onChange
    */
  handleChange: PropTypes.func,
  /**
   * onChange
    */
  onClickMarkAsDeleted: PropTypes.func
}

export default RowEnvironmentVariable
