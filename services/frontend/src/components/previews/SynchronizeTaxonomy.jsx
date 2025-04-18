import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, RICH_BLACK, DULLS_BACKGROUND_COLOR } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, HorizontalSeparator } from '@platformatic/ui-components'

function SynchronizeTaxonomy ({
  generationCurrent = '-',
  generationNext = '-',
  onClickCancel = () => {},
  onClickConfirm = () => {}
}) {
  const [synchronizing, setSynchronizing] = useState(false)

  function handleClickSynchronizeTaxonomy () {
    setSynchronizing(true)
    onClickConfirm()
  }

  return (
    <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
      <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
        <span className={`${typographyStyles.opacity70}`}>This action will apply Generation {generationNext} structure to Generation {generationCurrent}. <br />Are you sure you want proceed?</span>
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
          label={synchronizing ? 'Synchronizing...' : 'Synchronize'}
          onClick={() => handleClickSynchronizeTaxonomy()}
          color={RICH_BLACK}
          backgroundColor={WHITE}
          hoverEffect={DULLS_BACKGROUND_COLOR}
          bordered={false}
          disabled={synchronizing}
        />
      </div>
    </div>
  )
}

SynchronizeTaxonomy.propTypes = {
  /**
   * generationCurrent
    */
  generationCurrent: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  /**
   * generationNext
    */
  generationNext: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  /**
   * onClickEdit
   */
  onClickCancel: PropTypes.func,
  /**
   * onClickRemove
   */
  onClickConfirm: PropTypes.func
}

export default SynchronizeTaxonomy
