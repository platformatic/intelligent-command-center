import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { ERROR_RED, MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, RICH_BLACK, DULLS_BACKGROUND_COLOR } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './DeleteApplication.module.css'
import { Button, HorizontalSeparator } from '@platformatic/ui-components'
import Forms from '@platformatic/ui-components/src/components/forms'

function DeleteApplication ({
  name,
  onClickCancel = () => {},
  onClickConfirm = () => {}
}) {
  const [form, setForm] = useState({ name: '' })
  const [deleting, setDeleting] = useState(false)

  function handleChange (event) {
    setForm({ name: event.target.value })
  }

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
    <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
      <div className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
        <p className={styles.firstLine}>
          <span className={`${typographyStyles.opacity70}`}>You are about to destroy the application </span>"{name}"<span className={`${typographyStyles.opacity70}`}>:</span>
        </p>
        <div>
          <span className={`${typographyStyles.opacity70}`}>By confirming this action:
            <ul className={styles.list}>
              <li>The application will be removed from Main and Preview Taxonomies;</li>
              <li>The API Key will be invalidated;</li>
              <li>All the secrets will be removed.</li>
            </ul>
            Please enter the application name to continue.
          </span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
        <Forms.Field
          title='Application name'
          titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
          helperClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}
          required
        >
          <Forms.Input
            placeholder={name}
            name='name'
            borderColor={WHITE}
            value={form.name}
            inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
            backgroundColor={RICH_BLACK}
            onChange={handleChange}
          />
        </Forms.Field>
        <div className={styles.hr}>
          <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />
        </div>

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
            label={deleting ? 'Deleting App...' : 'Delete App'}
            onClick={() => onClickDelete()}
            color={WHITE}
            backgroundColor={ERROR_RED}
            hoverEffect={DULLS_BACKGROUND_COLOR}
            disabled={form.name !== name || deleting}
            bordered={false}
          />
        </div>
      </form>
    </div>
  )
}

DeleteApplication.propTypes = {
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

export default DeleteApplication
