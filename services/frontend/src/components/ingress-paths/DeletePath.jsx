import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { ERROR_RED, MARGIN_0, OPACITY_15, TRANSPARENT, WHITE, DULLS_BACKGROUND_COLOR } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, HorizontalSeparator } from '@platformatic/ui-components'

function DeletePath ({
  name = '-',
  onClickCancel = () => {},
  onClickConfirm = () => {}
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleSubmit (event) {
    event.preventDefault()
    onClickConfirm()
    setDeleting(true)
  }

  async function onClickDelete () {
    onClickConfirm()
    setDeleting(true)
  }

  return (
    <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
      <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
        <span className={`${typographyStyles.opacity70}`}>You are about to delete the path of your application </span>{name}<span className={`${typographyStyles.opacity70}`}>.</span><br /><br />
        <span className={`${typographyStyles.opacity70}`}>To expose this application you will need to create a new path.</span>
      </p>
      <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_15} />
      <form onSubmit={handleSubmit} className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
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
            label={deleting ? 'Deleting path...' : 'Delete path'}
            onClick={() => onClickDelete()}
            color={WHITE}
            backgroundColor={ERROR_RED}
            hoverEffect={DULLS_BACKGROUND_COLOR}
            disabled={deleting}
            bordered={false}
          />
        </div>
      </form>
    </div>
  )
}

DeletePath.propTypes = {
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

export default DeletePath
