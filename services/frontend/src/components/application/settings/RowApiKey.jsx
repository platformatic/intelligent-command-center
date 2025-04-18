import React from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { SMALL, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import styles from './RowApiKey.module.css'
import { getFormattedDate } from '~/utilities/dates'
import Icons from '@platformatic/ui-components/src/components/icons'
import gridStyles from '~/styles/GridStyles.module.css'
import { Button } from '@platformatic/ui-components'

function RowApiKey ({
  name = '',
  value = '',
  usedOn = '-',
  createdOn = '-',
  revoked = false,
  onClickRegenerate = () => {},
  onClickRevoke = () => {}
}) {
  return (
    <div className={styles.rowApiKey}>
      <div className={`${styles.tableSmallDescription} ${gridStyles.colSpanMiddle4}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Name</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${styles.customSmallFlexRow}`}>
            <Icons.AppIcon color={WHITE} size={SMALL} />
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{name}</span>
          </div>
        </div>
      </div>

      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle2}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Value</span>
        </div>
        <div className={styles.tableCell}>
          <div className={styles.customSmallFlexRow}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{value}</span>
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle2}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.ellipsis}`}>Used on</span>
        </div>
        <div className={styles.tableCell}>
          <div className={styles.customSmallFlexRow}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{getFormattedDate(usedOn)}</span>
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle2}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.ellipsis}`}>Created on</span>
        </div>
        <div className={styles.tableCell}>
          <div className={styles.customSmallFlexRow}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{getFormattedDate(createdOn)}</span>
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle2}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.ellipsis}`}>Actions</span>
        </div>
        <div className={styles.tableCell}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} `}>
            {!revoked && (
              <>
                <Button
                  type='button'
                  label='Revoke'
                  onClick={() => onClickRevoke()}
                  color={WHITE}
                  backgroundColor={TRANSPARENT}
                  textClass={typographyStyles.desktopButtonSmall}
                  paddingClass={commonStyles.smallButtonPadding}
                />
                <Button
                  type='button'
                  label='Regenerate'
                  onClick={() => onClickRegenerate()}
                  color={WHITE}
                  backgroundColor={TRANSPARENT}
                  textClass={typographyStyles.desktopButtonSmall}
                  paddingClass={commonStyles.smallButtonPadding}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

RowApiKey.propTypes = {
  /**
   * name
    */
  name: PropTypes.string,
  /**
   * value
    */
  value: PropTypes.string,
  /**
   * usedOn
    */
  usedOn: PropTypes.string,
  /**
   * createdOn
    */
  createdOn: PropTypes.string,
  /**
   * revoked
    */
  revoked: PropTypes.bool,
  /**
   * onClickRegenerate
    */
  onClickRegenerate: PropTypes.func,
  /**
   * onClickRevoke
    */
  onClickRevoke: PropTypes.func
}

export default RowApiKey
