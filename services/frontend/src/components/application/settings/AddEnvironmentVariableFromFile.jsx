import React from 'react'
import PropTypes from 'prop-types'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './AddEnvironmentVariableFromFile.module.css'
import { RICH_BLACK, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import { Button } from '@platformatic/ui-components'
import Forms from '@platformatic/ui-components/src/components/forms'
import gridStyles from '~/styles/GridStyles.module.css'

function AddEnvironmentVariableFromFile ({
  onClickAdd = () => {},
  label = ''
}) {
  return (
    <div className={styles.environmentVariablesFromFileRow}>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle4}`}>
        <div className={styles.tableCell}>
          <Forms.Input
            placeholder='Enter a new key'
            name='keyName'
            borderColor={WHITE}
            value={label}
            inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
            backgroundColor={RICH_BLACK}
            readOnly
          />
        </div>
      </div>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle7}`}>
        <div className={styles.tableCell}>
          <Forms.Input
            placeholder='Enter a value'
            name='keyValue'
            borderColor={WHITE}
            value='*********************************'
            inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
            backgroundColor={RICH_BLACK}
            readOnly
          />
        </div>
      </div>
      <div className={styles.tableSmall}>
        <div className={styles.buttonContainer}>
          <Button
            type='button'
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.buttonPadding}
            label='Add'
            onClick={onClickAdd}
            color={WHITE}
            backgroundColor={RICH_BLACK}
            platformaticIcon={{ iconName: 'CircleAddIcon', color: WHITE, size: SMALL }}
          />
        </div>
      </div>
    </div>
  )
}

AddEnvironmentVariableFromFile.propTypes = {
  /**
   * label
    */
  label: PropTypes.string,
  /**
   * onClickAdd
    */
  onClickAdd: PropTypes.func
}

export default AddEnvironmentVariableFromFile
