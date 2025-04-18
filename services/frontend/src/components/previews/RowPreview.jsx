import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import gridStyles from '~/styles/GridStyles.module.css'
import { SMALL, WHITE, OPACITY_30, TRANSPARENT, WARNING_YELLOW, MEDIUM, MARGIN_0, RICH_BLACK, DULLS_BACKGROUND_COLOR, TERTIARY_BLUE, MAIN_GREEN, ERROR_RED, POSITION_CENTER, ACTIVE_AND_INACTIVE_STATUS, DIRECTION_BOTTOM, DIRECTION_TOP } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Button, ButtonOnlyIcon, HorizontalSeparator, TooltipAbsolute, VerticalSeparator } from '@platformatic/ui-components'
import styles from './RowPreview.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import tooltipStyles from '~/styles/TooltipStyles.module.css'

function PreviewDetail ({ pullRequests = [] }) {
  const [localPullRequests, setLocalPullRequests] = useState([...pullRequests.slice(0, 2)])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (showAll) {
      setLocalPullRequests([...pullRequests])
    }
  }, [showAll])

  function addDivider (index) {
    if (showAll || (index === 0 && pullRequests.length >= 3) || pullRequests.length === 2) {
      return <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />
    }
    return (
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
        <hr className={styles.divider} />
        <Button
          label={`${pullRequests.length - 2} More Prs`}
          type='button'
          color={WHITE}
          backgroundColor={TRANSPARENT}
          hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
          paddingClass={commonStyles.smallButtonPadding}
          textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
          onClick={() => setShowAll(true)}
          bordered={false}
          platformaticIconAfter={{ iconName: 'ArrowRightIcon', color: WHITE, size: SMALL }}
        />
        <hr className={styles.divider} />
      </div>
    )
  }

  if (pullRequests.length >= 0 && pullRequests.length < 2) {
    const pullRequest = pullRequests[0] || {}
    return (
      <React.Fragment key={`${pullRequest.title}-${pullRequest.number}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth}`}>
          <Icons.PullRequestIcon size={SMALL} color={WHITE} />
          <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>#{pullRequest.number} {pullRequest.title}</span>
        </div>

        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${styles.smallLeftMargin}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${styles.repositoryName}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${typographyStyles.ellipsis}`}>{pullRequest?.repositoryName ?? '-'}</span>
          </div>

          <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />

          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Commit By:</span>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} `}>{pullRequest?.commitUserEmail}</span>
          </div>
        </div>
      </React.Fragment>
    )
  }

  return localPullRequests.map((pullRequest, index) => (
    <React.Fragment key={`${pullRequest.title}-${pullRequest.number}-${index}`}>
      <div className={`${commonStyles.flexBlockNoGap} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth}`}>
          <Icons.PullRequestIcon size={SMALL} color={WHITE} />
          <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>#{pullRequest.number} {pullRequest.title}</span>
        </div>

        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${styles.smallLeftMargin}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${styles.repositoryName}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${typographyStyles.ellipsis}`}>{pullRequest?.repositoryName ?? '-'}</span>
          </div>

          <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />

          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Commit By:</span>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} `}>{pullRequest?.commitUserEmail}</span>
          </div>
        </div>
      </div>
      {addDivider(index)}
    </React.Fragment>

  ))
}

function SchemaChanges ({ changes = { edited: 0, added: 0, removed: 0 } }) {
  return (
    <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
      <BorderedBox color={TERTIARY_BLUE} backgroundColor={RICH_BLACK} classes={`${commonStyles.smallButtonPadding} ${styles.boxChange}`}>
        <span className={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}>{changes.edited}</span>
      </BorderedBox>
      <BorderedBox color={MAIN_GREEN} backgroundColor={RICH_BLACK} classes={`${commonStyles.smallButtonPadding} ${styles.boxChange}`}>
        <span className={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}>{changes.added}</span>
      </BorderedBox>
      <BorderedBox color={ERROR_RED} backgroundColor={RICH_BLACK} classes={`${commonStyles.smallButtonPadding} ${styles.boxChange}`}>
        <span className={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}>{changes.removed}</span>
      </BorderedBox>
    </div>
  )
}

function onClickOpenUrl (url) {
  window.open(
    url,
    '_blank'
  )
}

function RowPreview ({
  id,
  taxonomyName = '-',
  pullRequests = [],
  risk = '',
  onClickViewDetail = () => {},
  taxonomyGeneration = '',
  synchronized = false,
  onClickSynchronize = () => {},
  changes = { edited: 0, added: 0, removed: 0 },
  url = '',
  indexRow = 0
}) {
  function getBorderColor () {
    if (risk === '') {
      return ''
    }
    if (risk < 15) {
      return styles.risk0
    }
    if (risk >= 15 && risk < 25) {
      return styles.risk15
    }
    if (risk >= 25 && risk < 35) {
      return styles.risk25
    }
    if (risk >= 35 && risk < 50) {
      return styles.risk35
    }
    if (risk >= 50 && risk < 65) {
      return styles.risk50
    }
    if (risk >= 65 && risk < 75) {
      return styles.risk65
    }
    if (risk >= 75 && risk < 85) {
      return styles.risk75
    }
    if (risk >= 85 && risk < 100) {
      return styles.risk85
    }
    return styles.risk100
  }

  function getLabelRisk (risk) {
    if (risk === '') return '-'
    return `${risk}%`
  }

  function getRiskLabelClassName (risk) {
    return `${typographyStyles.desktopBodyLargeSemibold} ${(getLabelRisk(risk) === '-') ? typographyStyles.opacity70 : ''}`
  }

  const borderedBoxRiskStyle = `${styles.riskDataContainer} ${commonStyles.flexBlockNoGap} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter} ${getBorderColor()}`

  return (
    <div className={styles.previewRow}>
      <div className={`${styles.tableSmallGeneration} ${gridStyles.colSpanLarge2} ${styles.generationContainer}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyEnd} ${commonStyles.fullHeight}`}>
          <div className={styles.arrowContainer} />
          {synchronized
            ? (
              <>
                <ButtonOnlyIcon
                  textClass={typographyStyles.desktopButtonSmall}
                  altLabel='Refresh'
                  paddingClass={commonStyles.smallButtonSquarePadding}
                  color={WHITE}
                  backgroundColor={RICH_BLACK}
                  disabled
                  hoverEffect={DULLS_BACKGROUND_COLOR}
                  platformaticIcon={{ size: MEDIUM, iconName: 'CircleCheckMarkButtonIcon', color: WHITE }}
                />
                <BorderedBox color={WHITE} borderColorOpacity={OPACITY_30} backgroundColor={TRANSPARENT} classes={`${styles.generationBoxBorder} ${commonStyles.tinyFlexBlock}`}>
                  <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter}`}>
                    <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{taxonomyGeneration}</span>
                  </div>
                </BorderedBox>
              </>
              )
            : (
              <>
                <TooltipAbsolute
                  tooltipClassName={tooltipStyles.tooltipDarkStyle}
                  content={(<p className={typographyStyles.textCenter}>Synchronize<br />Taxonomy</p>)}
                  offset={60}
                  position={POSITION_CENTER}
                  direction={indexRow === 0 ? DIRECTION_BOTTOM : DIRECTION_TOP}
                >
                  <ButtonOnlyIcon
                    textClass={typographyStyles.desktopButtonSmall}
                    altLabel='Refresh'
                    paddingClass={commonStyles.smallButtonSquarePadding}
                    color={WHITE}
                    backgroundColor={RICH_BLACK}
                    onClick={onClickSynchronize}
                    hoverEffect={DULLS_BACKGROUND_COLOR}
                    platformaticIcon={{ size: MEDIUM, iconName: 'RestartIcon', color: WHITE }}
                  />
                </TooltipAbsolute>
                <BorderedBox color={WHITE} borderColorOpacity={OPACITY_30} backgroundColor={TRANSPARENT} classes={`${styles.generationBoxBorder} ${commonStyles.tinyFlexBlock}`}>
                  <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter}`}>
                    <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWarningYellow}`}>{taxonomyGeneration}</span>
                    <Icons.AlertIcon color={WARNING_YELLOW} size={SMALL} />
                  </div>
                </BorderedBox>
              </>
              )}
        </div>
      </div>
      <div className={`${styles.tableSmall} ${styles.previewDetailContainer}`}>
        <BorderedBox color={WHITE} borderColorOpacity={OPACITY_30} backgroundColor={TRANSPARENT} classes={`${styles.pullRequestDataContainer} ${commonStyles.tinyFlexBlock}`}>
          <div className={`${commonStyles.miniFlexRow} ${commonStyles.justifyBetween} ${commonStyles.itemsCenter} ${commonStyles.fullWidth}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
              <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{taxonomyName}</span>
              {url && (
                <Button
                  label='Open preview'
                  type='button'
                  color={TERTIARY_BLUE}
                  backgroundColor={TRANSPARENT}
                  hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
                  paddingClass={commonStyles.smallButtonPadding}
                  textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textTertiaryBlue}`}
                  onClick={() => onClickOpenUrl(url)}
                  bordered={false}
                />
              )}
            </div>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
              <Button
                label='View details'
                type='button'
                color={WHITE}
                backgroundColor={TRANSPARENT}
                hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
                paddingClass={commonStyles.smallButtonPadding}
                textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
                onClick={() => onClickViewDetail()}
                bordered={false}
                platformaticIconAfter={{ iconName: 'InternalLinkIcon', color: WHITE, size: SMALL }}
              />
            </div>
          </div>
          {(pullRequests?.length ?? 0) > 0 && (
            <>
              <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />
              <PreviewDetail pullRequests={pullRequests} />
            </>
          )}
        </BorderedBox>
      </div>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanLarge3} ${styles.schemaChangesContainer}`}>
        <BorderedBox color={WHITE} borderColorOpacity={OPACITY_30} backgroundColor={TRANSPARENT} classes={`${styles.generationBoxBorder} ${commonStyles.tinyFlexBlock}`}>
          <SchemaChanges changes={changes} />
        </BorderedBox>
      </div>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanLarge2} ${styles.riskContainer}`}>
        <BorderedBox color={WHITE} backgroundColor={TRANSPARENT} borderColorOpacity={OPACITY_30} classes={borderedBoxRiskStyle}>
          <p className={getRiskLabelClassName(risk)}>{getLabelRisk(risk)}</p>
        </BorderedBox>
      </div>
    </div>
  )
}

RowPreview.propTypes = {
  /**
   * taxonomyName
    */
  taxonomyName: PropTypes.string,
  /**
   * taxonomyId
    */
  taxonomyId: PropTypes.string.isRequired,
  /**
   * pullRequests
    */
  pullRequests: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string,
    number: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]),
    commitUserEmail: PropTypes.string,
    repositoryName: PropTypes.string

  })),
  /**
   * risk
    */
  risk: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  /**
   * onClickViewDetail
    */
  onClickViewDetail: PropTypes.func,
  /**
   * taxonomyGeneration
    */
  taxonomyGeneration: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  /**
   * synchronized
    */
  synchronized: PropTypes.bool,
  /**
   * onClickSynchronize
    */
  onClickSynchronize: PropTypes.func,
  /**
   * changes
    */
  changes: PropTypes.object,
  /**
   * url
    */
  url: PropTypes.string,
  /**
   * indexRow
    */
  indexRow: PropTypes.number
}

export default RowPreview
