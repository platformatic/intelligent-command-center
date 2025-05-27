import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './InProgressComponent.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { LARGE, WHITE } from '@platformatic/ui-components/src/components/constants'

function InProgressComponent ({
  title = '',
  subtitle = '',
  icon = null
}) {
  const [counter, setCounter] = useState(0)
  const [directionAnimation, setDirectionAnimation] = useState('left')

  useEffect(() => {
    const timer = setInterval(() => setCounter(counter + 1), 1000)
    return () => clearInterval(timer)
  }, [counter])

  useEffect(() => {
    const timerAnimation = setInterval(() => setDirectionAnimation(directionAnimation === 'left' ? 'right' : 'left'), 1500)
    return () => clearInterval(timerAnimation)
  }, [directionAnimation])

  return (
    <div className={styles.container}>
      <div className={`${commonStyles.largeFlexBlock} ${commonStyles.itemsCenter} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          <Icons.CircleCheckMarkIcon size={LARGE} color={WHITE} />
          <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
            <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${typographyStyles.textCenter} ${commonStyles.fullWidth}`}>
              {title}
            </p>
            <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${typographyStyles.textCenter} ${commonStyles.fullWidth}`}>
              {subtitle}
            </p>
          </div>
        </div>
        <div className={`${commonStyles.smallFlexBlock} ${commonStyles.itemsCenter} ${styles.content}`}>
          <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${styles.progressBarContainerAndCounter}`}>
            <div className={styles.progressBarContainer}>
              {directionAnimation === 'left'
                ? (
                  <>
                    <div className={styles.leftSlidingSphere} />
                    <div className={styles.leftSlidingComet} />
                  </>
                  )
                : (
                  <>
                    <div className={styles.rightSlidingSphere} />
                    <div className={styles.rightSlidingComet} />
                  </>
                  )}
            </div>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
              {icon}
              <p className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>
                {counter} second{counter > 1 ? 's' : ''} ago
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InProgressComponent
