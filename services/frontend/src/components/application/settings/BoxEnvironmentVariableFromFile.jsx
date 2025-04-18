import React from 'react'
import PropTypes from 'prop-types'
import { MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, DULLS_BACKGROUND_COLOR, RICH_BLACK } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './BoxEnvironmentVariableFromFile.module.css'
import { BorderedBox, Button, HorizontalSeparator } from '@platformatic/ui-components'
import AddEnvironmentVariableFromFile from './AddEnvironmentVariableFromFile'

function BoxEnvironmentVariableFromFile ({
  onClickRemoveFile = () => {},
  onClickAdd = () => {},
  onClickAddAllVariables = () => {},
  onClickReplaceCurrentVariable = () => {},
  environmentVariables = []
}) {
  function handleOnClickAddAllVariable () {
    const newEnvVars = environmentVariables.reduce((acc, current) => {
      acc[current.label] = current.value
      return acc
    }, {})
    return onClickAddAllVariables(newEnvVars)
  }

  return (
    <BorderedBox color={WHITE} borderColorOpacity={OPACITY_30} backgroundColor={TRANSPARENT} classes={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
      <div className={styles.environmentVariablesContainer}>
        {environmentVariables.map((variable, index) => <AddEnvironmentVariableFromFile key={`${variable.label}-${index}`} onClickAdd={() => onClickAdd(variable)} label={variable.label} />)}
      </div>

      <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />

      <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
        <Button
          type='button'
          label='Remove file'
          onClick={() => onClickRemoveFile()}
          color={WHITE}
          backgroundColor={TRANSPARENT}
          textClass={typographyStyles.desktopButtonSmall}
          paddingClass={commonStyles.smallButtonPadding}
        />
        <div className={commonStyles.smallFlexRow}>
          <Button
            type='button'
            label='Replace current variables'
            onClick={() => onClickReplaceCurrentVariable()}
            color={WHITE}
            backgroundColor={TRANSPARENT}
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
          />
          <Button
            type='button'
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
            label='Add all variables'
            onClick={() => handleOnClickAddAllVariable()}
            color={RICH_BLACK}
            backgroundColor={WHITE}
            hoverEffect={DULLS_BACKGROUND_COLOR}
            bordered={false}
            disabled={environmentVariables.length === 0}
          />
        </div>
      </div>
    </BorderedBox>
  )
}

BoxEnvironmentVariableFromFile.propTypes = {
  /**
   * onClickRemoveFile
   */
  onClickRemoveFile: PropTypes.func,
  /**
   * onClickAdd
   */
  onClickAdd: PropTypes.func,
  /**
   * onClickAddAllVariables
   */
  onClickAddAllVariables: PropTypes.func,
  /**
   * onClickReplaceCurrentVariable
   */
  onClickReplaceCurrentVariable: PropTypes.func,
  /**
   * environmentVariables
   */
  environmentVariables: PropTypes.array

}

export default BoxEnvironmentVariableFromFile
