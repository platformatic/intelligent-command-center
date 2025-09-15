import React from 'react'
import { WHITE, OPACITY_30, TRANSPARENT, WARNING_YELLOW, SMALL, BLACK_RUSSIAN, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import styles from './AppNameBox.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import tooltipStyles from '~/styles/TooltipStyles.module.css'
import { BorderedBox, PlatformaticIcon, Tooltip, VerticalSeparator } from '@platformatic/ui-components'
import { getFormattedDate } from '~/utilities/dates'
import Icons from '@platformatic/ui-components/src/components/icons'
import useICCStore from '~/useICCStore'

// Helper function to get the latest compatible version for an app's current version
function getLatestCompatibleVersion (currentVersion, packageVersions, packageName) {
  if (!currentVersion || !packageVersions?.[packageName]) {
    return null
  }

  // Extract major version from current version (e.g., "1.52.0" -> 1)
  const versionMatch = currentVersion.match(/^(\d+)\./)
  if (!versionMatch) {
    return null
  }

  const majorVersion = parseInt(versionMatch[1])
  return packageVersions[packageName][majorVersion] || null
}

function AppNameBox ({
  gridClassName = '',
  application,
  applicationPublicUrl = ''
}) {
  const globalState = useICCStore()

  const { packageVersions } = globalState

  // Get the latest compatible runtime version for this app
  const latestCompatibleVersion = getLatestCompatibleVersion(
    application.pltVersion,
    packageVersions,
    '@platformatic/runtime'
  )

  // Debug logging for version comparison
  const shouldShowWarning = application.pltVersion !== latestCompatibleVersion && latestCompatibleVersion

  return (
    <BorderedBox classes={`${styles.borderexBoxContainer} ${gridClassName}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.smallFlexResponsiveRow} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.tinyFlexResponsiveRow} ${commonStyles.fullWidth}`}>
            <div className={commonStyles.tinyFlexRow}>
              <Icons.AppIcon
                color={WHITE}
                size={MEDIUM}
              />
              <div className={styles.applicationName}>
                <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{application.name}</p>
              </div>
            </div>
          </div>
        </div>
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={styles.rowContainer}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Last Update:</span>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{getFormattedDate(application.lastUpdated)}</span>
            </div>

            <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />

            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Last Started:</span>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{getFormattedDate(application.lastStarted)}</span>
            </div>

            <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />

            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Created On:</span>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{getFormattedDate(application.createdAt)}</span>
            </div>
          </div>
          <div className={styles.rowContainer}>
            <div className={`${commonStyles.smallFlexResponsiveRow}`}>
              {!application.pltVersion
                ? (<span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Current Runtime Version: -</span>)
                : (
                  <>
                    <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                      <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Current Runtime Version: </span>
                      {application.pltVersion
                        ? (
                          <>
                            <span className={`${typographyStyles.desktopBodySmall} ${shouldShowWarning ? typographyStyles.textWarningYellow : typographyStyles.textWhite}`}>{application.pltVersion}</span>
                            {shouldShowWarning && (
                              <Tooltip
                                tooltipClassName={tooltipStyles.tooltipDarkStyle}
                                content={(<span>There is a new Platformatic version: {latestCompatibleVersion}</span>)}
                                offset={24}
                                immediateActive={false}
                              >
                                <PlatformaticIcon iconName='AlertIcon' color={WARNING_YELLOW} size={SMALL} internalOverHandling />
                              </Tooltip>
                            )}
                          </>)
                        : (<span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>-</span>)}
                    </div>
                  </>
                  )}
            </div>
          </div>

          {applicationPublicUrl && (
            <div className={styles.rowContainer}>
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>URL:</span>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{applicationPublicUrl} </span>
                <PlatformaticIcon iconName='ExpandIcon' color={WHITE} size={SMALL} onClick={() => window.open(applicationPublicUrl, '_blank')} internalOverHandling disabled={applicationPublicUrl === ''} />
              </div>
            </div>
          )}
        </div>
      </div>
    </BorderedBox>
  )
}

export default AppNameBox
