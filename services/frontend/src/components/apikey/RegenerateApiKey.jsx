import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, DULLS_BACKGROUND_COLOR, RICH_BLACK, POSITION_CENTER, SMALL, MAIN_GREEN, LARGE } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, Button, CopyAndPaste, HorizontalSeparator, LoadingSpinnerV2, PlatformaticIcon } from '@platformatic/ui-components'
import { callApiRegenerateKey } from '~/api'
import styles from './RegenerateApiKey.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import tooltipStyles from '~/styles/TooltipStyles.module.css'
import Forms from '@platformatic/ui-components/src/components/forms'
import Icons from '@platformatic/ui-components/src/components/icons'

function RegenerateApiKey ({
  id,
  applicationId,
  name = '',
  onClickCancel = () => {},
  onError = () => {},
  onClickClose = () => {},
  onRegeneratedKey = () => {}
}) {
  const [applicationKey, setApplicationKey] = useState(null)
  const [innerLoading, setInnerLoading] = useState(false)

  async function onClickConfirm () {
    try {
      setInnerLoading(true)
      const { key, regenerated } = await callApiRegenerateKey(applicationId, id)
      if (regenerated) {
        setApplicationKey(key)
        onRegeneratedKey()
      } else {
        onError(new Error('API KEY Not revoked'))
      }
    } catch (error) {
      console.error(`Error on onClickConfirm ${error}`)
      onError(error)
    } finally {
      setInnerLoading(false)
    }
  }

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Regenerating Api Key...'
            }]
          }}
          containerClassName={loadingSpinnerStyles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (applicationKey) {
      return (
        <>
          <div className={`${commonStyles.smallFlexBlock} ${commonStyles.itemsCenter}`}>
            <Icons.CircleCheckMarkIcon color={MAIN_GREEN} size={LARGE} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>API Key regenerated</p>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${typographyStyles.textCenter}`}>You successfully regenerated the API key of your application.
              <br />Make sure to copy the new API Key before closing.
            </span>
          </div>
          <div className={`${commonStyles.extraMediumFlexBlock} ${commonStyles.fullWidth}`}>
            <Forms.Field
              title='API Key'
              titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
            >
              <div className={styles.apiKeyContainer}>
                <textarea
                  className={`${styles.textArea} ${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`} readOnly
                  cols='auto'
                  rows={7}
                  value={applicationKey}
                />
                <CopyAndPaste
                  value={applicationKey}
                  tooltipLabel='Api key copied!'
                  color={WHITE}
                  size={SMALL}
                  tooltipClassName={tooltipStyles.tooltipDarkStyle}
                  position={POSITION_CENTER}
                />
              </div>
            </Forms.Field>

            <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />

            <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
              <Button
                label='Close'
                type='button'
                color={RICH_BLACK}
                backgroundColor={WHITE}
                hoverEffect={DULLS_BACKGROUND_COLOR}
                paddingClass={commonStyles.smallButtonPadding}
                textClass={typographyStyles.desktopButtonSmall}
                bordered={false}
                onClick={() => onClickClose()}
              />
            </div>

          </div>
        </>
      )
    }

    return (
      <BorderedBox color={WHITE} borderColorOpacity={OPACITY_30} backgroundColor={TRANSPARENT} classes={styles.detailsLogContainer}>
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>Regenerate API Key</div>
            <PlatformaticIcon iconName='CloseIcon' color={WHITE} size={SMALL} onClick={() => onClickCancel()} />
          </div>
          <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
            <span className={`${typographyStyles.opacity70}`}>You are about to regenerate the API Key for your application </span>{name}<span className={`${typographyStyles.opacity70}`}>.</span>
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
              label='Regenerate Key'
              onClick={() => onClickConfirm()}
              color={RICH_BLACK}
              backgroundColor={WHITE}
              hoverEffect={DULLS_BACKGROUND_COLOR}
              bordered={false}
            />
          </div>
        </div>
      </BorderedBox>
    )
  }

  return (
    <div className={`${styles.addApplicationContainer} ${commonStyles.extraMediumFlexBlock} ${commonStyles.itemsCenter}`}>
      {renderComponent()}
    </div>
  )
}

RegenerateApiKey.propTypes = {
  /**
   * id
   */
  id: PropTypes.string.isRequired,
  /**
   * applicationId
   */
  applicationId: PropTypes.string.isRequired,
  /**
   * name
   */
  name: PropTypes.string,
  /**
   * onClickCancel
   */
  onClickCancel: PropTypes.func,
  /**
   * onError
   */
  onError: PropTypes.func,
  /**
   * onClickClose
   */
  onClickClose: PropTypes.func,
  /**
   * onRegeneratedKey
   */
  onRegeneratedKey: PropTypes.func
}

export default RegenerateApiKey
