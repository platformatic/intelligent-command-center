import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './ErrorComponent.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { ANTI_FLASH_WHITE, DULLS_BACKGROUND_COLOR, ERROR_RED, LARGE, SMALL, RICH_BLACK, WHITE, TRANSPARENT, OPACITY_30, MARGIN_0 } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Button, HorizontalSeparator, Tooltip } from '@platformatic/ui-components'
import tooltipStyles from '~/styles/TooltipStyles.module.css'
import { HOME_PATH } from '../../ui-constants'
import useICCStore from '../../useICCStore'
import { useNavigate } from 'react-router-dom'

// eslint-disable-next-line no-unused-vars
function ErrorComponent ({
  title = 'Something went wrong!',
  error = {},
  message = '',
  onClickDismiss = () => {},
  containerClassName = ''
}) {
  const [showLogs, setShowLogs] = useState(false)
  const [logsCopied, setLogsCopied] = useState(false)
  const [errorStack] = useState(error?.stack?.split('\n') || [])

  const navigate = useNavigate()
  const globalState = useICCStore()
  const { setUser, setIsAuthenticated } = globalState
  function shouldLogout () {
    try {
      // TODO: investigate why this is not working
      // sometimes page loops over and over again
      // return false
      return false && error.message.includes('PLT_USER_MANAGER_MISSING_CREDENTIALS')
    } catch (err) {
      console.error('Error in shouldLogout', err)
      return false
    }
  }

  useEffect(() => {
    if (shouldLogout()) {
      logout()
    }
  }, [])
  function logout () {
    setUser({})
    setIsAuthenticated(false)
    navigate(HOME_PATH)
  }
  function copyLogs () {
    setLogsCopied(true)
    navigator.clipboard.writeText(error.stack)
    setTimeout(() => {
      setLogsCopied(false)
    }, 1000)
  }

  function getButtonCopyIcon () {
    if (logsCopied) {
      return { iconName: 'CircleCheckMarkIcon', size: SMALL, color: WHITE }
    }
    return { iconName: 'CLIIcon', size: SMALL, color: WHITE }
  }

  // function reportIssue () {}

  return (
    <div className={containerClassName || styles.container}>
      <div className={`${commonStyles.largeFlexBlock} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
        <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          <Icons.AlertIcon size={LARGE} color={ERROR_RED} />
          <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
            <p className={`${typographyStyles.desktopBodyLarge} ${typographyStyles.textWhite} ${typographyStyles.textCenter} ${commonStyles.fullWidth}`}>
              {title}
            </p>
            <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${typographyStyles.textCenter} ${commonStyles.fullWidth}`}>
              Please check your logs below.
            </p>
          </div>
        </div>
        <div className={`${styles.buttonContainer} ${commonStyles.fullWidth}`}>
          <Button
            textClass={typographyStyles.desktopButtonSmall}
            label='Dismiss'
            onClick={() => onClickDismiss()}
            color={RICH_BLACK}
            backgroundColor={WHITE}
            paddingClass={`${commonStyles.buttonPadding} cy-action-dismiss`}
            hoverEffect={DULLS_BACKGROUND_COLOR}
            hoverEffectProperties={{ changeBackgroundColor: ANTI_FLASH_WHITE }}
            bordered={false}
          />
          {errorStack.length > 0 && (
            <Button
              label={showLogs ? 'Hide logs' : 'Show Logs'}
              onClick={() => setShowLogs(!showLogs)}
              color={WHITE}
              backgroundColor={RICH_BLACK}
              paddingClass={`${commonStyles.buttonPadding} cy-action-dismiss`}
              textClass={typographyStyles.desktopButtonSmall}
              platformaticIconAfter={{ iconName: showLogs ? 'ArrowUpIcon' : 'ArrowDownIcon', size: SMALL, color: WHITE }}
            />
          )}
        </div>
      </div>
      {showLogs && (
        <BorderedBox color={WHITE} borderColorOpacity={OPACITY_30} backgroundColor={TRANSPARENT} classes={styles.showedLogsContainer}>
          <div className={`${styles.buttonLogsContainer} ${commonStyles.fullWidth}`}>
            <Tooltip
              tooltipClassName={tooltipStyles.tooltipDarkStyle}
              visible={logsCopied}
              content={(<span>Logs copied!</span>)}
              offset={4}
              activeDependsOnVisible
            >
              <Button
                label='Copy Logs'
                onClick={() => copyLogs()}
                color={WHITE}
                backgroundColor={RICH_BLACK}
                paddingClass={`${commonStyles.buttonPadding} cy-action-dismiss`}
                textClass={`${typographyStyles.desktopButtonSmall} action-copy-logs`}
                platformaticIcon={getButtonCopyIcon()}
              />
            </Tooltip>
            {/* <Button
              label='Report issue'
              disabled
              onClick={() => reportIssue()}
              color={WHITE}
              backgroundColor={RICH_BLACK}
              paddingClass={`${commonStyles.buttonPadding} cy-action-dismiss`}
              textClass={typographyStyles.desktopButtonSmall}
              platformaticIcon={{ iconName: 'LogsRiskIcon', size: SMALL, color: WHITE }}
            /> */}
          </div>
          <HorizontalSeparator marginTop={MARGIN_0} marginBottom={MARGIN_0} color={WHITE} opacity={OPACITY_30} />
          <div className={`${styles.logContainer} ${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}>
            {errorStack.map((s, index) => <p key={index}>{s}</p>)}
          </div>
        </BorderedBox>
      )}
    </div>
  )
}

export default ErrorComponent
