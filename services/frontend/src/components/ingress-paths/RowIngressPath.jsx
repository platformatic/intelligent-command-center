import React from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { SMALL, WHITE, ERROR_RED, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import { Button } from '@platformatic/ui-components'
import styles from './RowIngressPath.module.css'
import gridStyles from '~/styles/GridStyles.module.css'

function RowIngressPath ({
  path = '-',
  applicationName = '',
  onClickAddPath = () => {},
  onClickEdit = () => {},
  onClickDelete = () => {}
}) {
  return (
    <div className={styles.rowIngressPath}>
      <div className={`${styles.tableSmallDescription} ${gridStyles.colSpanMiddle4}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Application Name</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${styles.customSmallFlexRow}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{applicationName}</span>
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle6}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Path</span>
        </div>
        <div className={styles.tableCell}>
          <div className={styles.customSmallFlexRow}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{path}</span>
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle2}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.ellipsis}`}>Actions</span>
        </div>
        <div className={styles.tableCell}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} `}>
            {path === '-'
              ? (
                <Button
                  type='button'
                  label='Add path'
                  onClick={onClickAddPath}
                  color={WHITE}
                  backgroundColor={TRANSPARENT}
                  textClass={typographyStyles.desktopButtonSmall}
                  paddingClass={commonStyles.smallButtonPadding}
                  platformaticIcon={{ iconName: 'AddRouteIcon', size: SMALL, color: WHITE }}
                  fullWidth
                />
                )
              : (
                <>
                  <Button
                    type='button'
                    label='Edit'
                    onClick={onClickEdit}
                    color={WHITE}
                    backgroundColor={TRANSPARENT}
                    textClass={typographyStyles.desktopButtonSmall}
                    paddingClass={commonStyles.smallButtonPadding}
                    platformaticIcon={{ iconName: 'EditIcon', size: SMALL, color: WHITE }}
                    fullWidth
                  />
                  <Button
                    type='button'
                    label='Delete'
                    onClick={onClickDelete}
                    color={ERROR_RED}
                    backgroundColor={TRANSPARENT}
                    textClass={typographyStyles.desktopButtonSmall}
                    paddingClass={commonStyles.smallButtonPadding}
                    platformaticIcon={{ iconName: 'TrashIcon', size: SMALL, color: ERROR_RED }}
                    fullWidth
                  />
                </>
                )}
          </div>
        </div>
      </div>
    </div>
  )
}

RowIngressPath.propTypes = {
  /**
   * id
    */
  id: PropTypes.string.isRequired,
  /**
   * path
    */
  path: PropTypes.string,
  /**
   * applicationName
    */
  applicationName: PropTypes.string,
  /**
   * onClickAddPath
    */
  onClickAddPath: PropTypes.func,
  /**
   * onClickEdit
    */
  onClickEdit: PropTypes.func,
  /**
   * onClickDelete
    */
  onClickDelete: PropTypes.func
}

export default RowIngressPath
