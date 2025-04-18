import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './PanelEnvironmentVariables.module.css'
import { OPACITY_15, WHITE, MARGIN_0, TRANSPARENT, MEDIUM, BLACK_RUSSIAN, SMALL } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Checkbox, HorizontalSeparator } from '@platformatic/ui-components'
import { useState } from 'react'
import Forms from '@platformatic/ui-components/src/components/forms'
import Icons from '@platformatic/ui-components/src/components/icons'

function EnvironmentVariable ({ label, include, changeInclude }) {
  const [checked, setChecked] = useState(include)
  function onChangeInclude () {
    setChecked(!checked)
    changeInclude()
  }

  return (
    <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
      <Checkbox onChange={() => onChangeInclude()} color={WHITE} checked={checked} size={SMALL} />
      <label className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>
        <span>{label}</span>
      </label>
    </div>
  )
}

function PanelEnvironmentVariables ({ environmentVariables = [], filename = '', onClickSetAllEnvironmentVariable = () => {} }) {
  const [selectAllVariables, setSelectAllVariables] = useState(true)

  function handleSelectAllVariable () {
    onClickSetAllEnvironmentVariable(!selectAllVariables)
    setSelectAllVariables(!selectAllVariables)
  }

  return (
    <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth} ${styles.heightModal}`}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>

        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
          <Icons.EnvVariableszIcon
            color={WHITE}
            size={MEDIUM}
          />
          <div>
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Environment Variables </p>
          </div>
        </div>

        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>File:</span>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{filename}</span>
          </div>

          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Variables:</span>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{environmentVariables.length}</span>
          </div>
        </div>
      </div>

      {environmentVariables.length > 0 && (
        <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxEnvironmentVariableContainer}>
          <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
            <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
              <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Environment Variables found in file</p>
              <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Please select the variables you would like to apply to your application.</p>
            </div>

            <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_15} />

            <Forms.ToggleSwitch
              label='Select all variables'
              labelClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
              id='selectAllVariables'
              onChange={() => handleSelectAllVariable()}
              checked={selectAllVariables}
              size={SMALL}
            />
            <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${styles.divScrollable}`}>
              {environmentVariables.map((environment, index) => <EnvironmentVariable key={`${environment.label}-${index}-${environment.include}`} {...environment} changeInclude={() => { environment.include = !environment.include }} />)}
            </div>
          </div>

        </BorderedBox>
      )}
    </div>
  )
}

PanelEnvironmentVariables.propTypes = {
  /**
   * environmentVariables
    */
  environmentVariables: PropTypes.array,
  /**
   * filename
    */
  filename: PropTypes.string,
  /**
   * filename
    */
  onClickSetAllEnvironmentVariable: PropTypes.func
}

export default PanelEnvironmentVariables
