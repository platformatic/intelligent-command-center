import React from 'react'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { MEDIUM, OPACITY_100, OPACITY_15, BLACK_RUSSIAN, SMALL, WHITE, TRANSPARENT, OPACITY_30 } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Icons, PlatformaticIcon, VerticalSeparator } from '@platformatic/ui-components'
import styles from './WattCard.module.css'
import { useNavigate } from 'react-router-dom'
import { getFormattedDate } from '~/utilities/dates'

export default function WattCard ({
  id,
  name = '',
  createdAt = '-',
  url = null,
  state = {},
  latestChange = '-'
}) {
  const navigate = useNavigate()

  function handleOpenUrl (event) {
    event.stopPropagation()
    window.open(url, '_blank')
  }

  function handleWattClick () {
    if (hasValidState()) {
      navigate(`/watts/${id}`)
    } else {
      window.alert(`Application ${name} is loading...`)
    }
  }
  function hasValidState () {
    return state?.services?.length > 0
  }
  return (
    <BorderedBox
      color={TRANSPARENT}
      backgroundColor={BLACK_RUSSIAN}
      backgroundColorOpacity={OPACITY_100}
      classes={styles.wattGrid}
      backgroundColorOver={WHITE}
      backgroundColorOpacityOver={OPACITY_15}
      onClick={handleWattClick}
      clickable
      internalOverHandling
    >
      <p className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${hasValidState() ? '' : styles.loading}`}>
        <Icons.AppIcon color={WHITE} size={MEDIUM} />
        <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`} title={name}>{name}</span>
      </p>
      <>
        {url && (
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${styles.smallLeftPadding}`}>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}  ${typographyStyles.opacity70}`}>{url}</span>
            <PlatformaticIcon iconName='ExpandIcon' color={WHITE} size={SMALL} onClick={handleOpenUrl} internalOverHandling />
          </div>
        )}
        {hasValidState() && (
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${styles.smallLeftPadding}`}>
            <p>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}  ${typographyStyles.opacity70}`}>Latest change: </span><span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{getFormattedDate(latestChange)}</span>
            </p>
            <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} />
            <p>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}  ${typographyStyles.opacity70}`}>Applications: </span><span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{state?.services?.length ?? '-'}</span>
            </p>
          </div>
        )}
        {(!hasValidState()) && (
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${styles.smallLeftPadding}`}>
            <p className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}  ${typographyStyles.opacity70}`}>Loading...</p>
          </div>
        )}
      </>
    </BorderedBox>
  )
}
