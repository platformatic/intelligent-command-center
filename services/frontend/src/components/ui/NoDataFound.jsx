import React from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './NoDataFound.module.css'

function NoDataFound ({
  title = 'No Data Available',
  subTitle = '',
  titleClassName = `${typographyStyles.desktopBody} ${typographyStyles.textWhite}`,
  subTitleClassName = `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
  children = null,
  fullCentered = false
}) {
  return (
    <div className={`${styles.noDataFoundContainer} ${fullCentered ? styles.fullCentered : ''}`}>
      <div className={`${commonStyles.mediumFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter}`}>
        <div className={styles.iconRadarContainer}>
          <svg width='125' height='125' viewBox='0 0 125 125' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <path opacity='0.3' d='M62.5002 94.6797C80.2727 94.6797 94.6802 80.2722 94.6802 62.4998C94.6802 44.7273 80.2727 30.3198 62.5002 30.3198C44.7278 30.3198 30.3203 44.7273 30.3203 62.4998C30.3203 80.2722 44.7278 94.6797 62.5002 94.6797Z' stroke='white' strokeLinejoin='round' />
            <path opacity='0.15' d='M62.5013 111.816C89.7376 111.816 111.817 89.7366 111.817 62.5003C111.817 35.264 89.7376 13.1846 62.5013 13.1846C35.265 13.1846 13.1855 35.264 13.1855 62.5003C13.1855 89.7366 35.265 111.816 62.5013 111.816Z' stroke='white' strokeLinejoin='round' />
            <path opacity='0.05' d='M62.5 124.5C96.7417 124.5 124.5 96.7417 124.5 62.5C124.5 28.2583 96.7417 0.5 62.5 0.5C28.2583 0.5 0.5 28.2583 0.5 62.5C0.5 96.7417 28.2583 124.5 62.5 124.5Z' stroke='white' strokeLinejoin='round' />
            <path d='M62.4999 63.0166C61.9292 63.0166 61.4665 62.554 61.4665 61.9833C61.4665 61.4126 61.9292 60.95 62.4999 60.95C63.0706 60.95 63.5332 61.4126 63.5332 61.9833C63.5332 62.554 63.0706 63.0166 62.4999 63.0166Z' fill='#21FA90' stroke='#21FA90' strokeWidth='1.5' />
            <path d='M62.0564 61.6142L23.9707 14.2285' stroke='#21FA90' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' className={styles.clockWiseRotation} />
            <path d='M23.7384 14.027C23.7384 14.027 1.54084 31.6319 1.54084 53.064L61.6152 61.6142L23.7384 14.027Z' fill='url(#paint0_linear_5564_60898)' className={styles.clockWiseRotation} />
            <defs>
              <linearGradient id='paint0_linear_5564_60898' x1='49.7631' y1='14.7924' x2='35.9853' y2='58.422' gradientUnits='userSpaceOnUse'>
                <stop stopColor='#21FA90' />
                <stop offset='1' stopColor='#21FA90' stopOpacity='0' />
              </linearGradient>
            </defs>
          </svg>

        </div>
        <div className={`${commonStyles.mediumFlexBlock}`}>
          <div className={`${commonStyles.tinyFlexBlock}`}>
            <p className={`${commonStyles.fullWidth} ${titleClassName}`}>{title}</p>
            <p className={`${commonStyles.fullWidth} ${subTitleClassName}`}>{subTitle}</p>
          </div>
          <div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

NoDataFound.propTypes = {
  /**
   * title
  */
  title: PropTypes.string,
  /**
   * titleClassName
  */
  titleClassName: PropTypes.string,
  /**
   * subTitle
  */
  subTitle: PropTypes.object,
  /**
   * subTitleClassName
  */
  subTitleClassName: PropTypes.string,
  /**
   * children
   */
  children: PropTypes.node
}

export default NoDataFound
