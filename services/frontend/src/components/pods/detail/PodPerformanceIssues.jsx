import React from 'react'
import styles from './PodPerformanceIssues.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, VerticalSeparator } from '@platformatic/ui-components'
import { BLACK_RUSSIAN, MEDIUM, OPACITY_15, SMALL, TRANSPARENT, WARNING_YELLOW, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'

function PodPerformanceIssues ({
  reasons = []
}) {
  function displayValue (value = '-', digitalDigits = 0) {
    if (value === '-' || value === null) {
      return value
    }
    return `${value.toFixed(digitalDigits)}`
  }

  function getTitle (reason) {
    if (reason.rss) return 'RSS'
    if (reason.usedHeap) return 'Heap'
    if (reason.cpu) return 'CPU'
    if (reason.eventLoop) return 'ELU'
    return ''
  }

  function getValues (reason) {
    if (getTitle(reason) === 'RSS') {
      return (
        <>
          <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWarningYellow}`}>{displayValue(reason?.rss ?? '-', 3)}</h4>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>GB</span>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>/</span>
          <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWarningYellow}`}>{displayValue(reason?.podMemoryLimit ?? '-', 3)}</h4>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>GB</span>
        </>
      )
    }
    if (getTitle(reason) === 'Heap') {
      return (
        <>
          <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWarningYellow}`}>{displayValue(reason?.usedHeap ?? '-', 3)}</h4>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>GB</span>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>/</span>
          <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWarningYellow}`}>{displayValue(reason?.totalHeap ?? '-', 3)}</h4>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>GB</span>
        </>
      )
    }

    if (getTitle(reason) === 'CPU') {
      return (
        <>
          <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWarningYellow}`}>{displayValue(reason?.cpu ?? '-')}</h4>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>%</span>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>/</span>
          <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWarningYellow}`}>{displayValue(reason?.eventLoop ?? '-')}</h4>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>%</span>
        </>
      )
    }

    return (
      <>
        <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWarningYellow}`}>{displayValue(reason?.eventLoop ?? '-')}</h4>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>%</span>
      </>
    )
  }

  function renderComponent () {
    if (reasons.length === 0) {
      return (
        <div className={`${commonStyles.flexBlockNoGap} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter} ${commonStyles.fullHeight}`}>
          <Icons.CircleCheckMarkIcon color={WHITE} size={MEDIUM} />
          <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>No performance issues detected in this pod</p>
        </div>
      )
    }

    if (reasons.length > 3) {
      return (
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          {reasons.map((reason, index) => (
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}  ${commonStyles.itemsCenter}`} key={`${reason.message}-${index}`}>
              <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{getTitle(reason)}</span>
              <div className={`${commonStyles.miniFlexRow} ${commonStyles.itemsCenter}`}>
                <Icons.AlertIcon size={SMALL} color={WARNING_YELLOW} />
                {getValues(reason)}
              </div>
              <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${typographyStyles.ellipsis} ${styles.containerReasonMessageHorizontal}`}>{reason.message}</p>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.fullHeight} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter}`}>
        {reasons.map((reason, index) => (
          <React.Fragment key={`${reason.message}-${index}`}>
            <div className={`${commonStyles.miniFlexBlock} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter}`}>
              <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{getTitle(reason)}</span>
              <div className={`${commonStyles.miniFlexRow} ${commonStyles.itemsCenter}`}>
                <Icons.AlertIcon size={SMALL} color={WARNING_YELLOW} />
                {getValues(reason)}
              </div>
              <div className={styles.containerReasonMessage}>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{reason.message}</span>
              </div>
            </div>
            {(index < reasons.length - 1) ? <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_15} classes={styles.verticalSeparator} /> : ''}
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={`${styles.borderedBoxPodPerformanceIssue} ${commonStyles.flexGrow}`}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullHeight}`}>
        <div className={`${commonStyles.smallFlexRow}`}>
          <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Pod Performance Issues</p>
        </div>
        {renderComponent()}
      </div>
    </BorderedBox>
  )
}

export default PodPerformanceIssues
