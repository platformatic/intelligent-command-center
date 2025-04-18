import React from 'react'
import styles from './ConfirmButton.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button } from '@platformatic/ui-components'
import { DULLS_BACKGROUND_COLOR, ERROR_RED, RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'

export default function ConfirmButton ({
  onConfirm = () => {},
  onAbort = () => {}
}) {
  return (
    <div className={styles.container}>
      <Button
        type='button'
        textClass={typographyStyles.desktopButtonSmall}
        paddingClass={commonStyles.smallButtonPadding}
        label='Done'
        onClick={onConfirm}
        color={WHITE}
        backgroundColor={RICH_BLACK}
        hoverEffect={DULLS_BACKGROUND_COLOR}
        platformaticIcon={{ iconName: 'CircleCheckMarkIcon', color: WHITE }}
      />

      <Button
        type='button'
        textClass={typographyStyles.desktopButtonSmall}
        paddingClass={commonStyles.smallButtonPadding}
        label='Abort'
        onClick={onAbort}
        color={ERROR_RED}
        backgroundColor={RICH_BLACK}
        hoverEffect={DULLS_BACKGROUND_COLOR}
        platformaticIcon={{ iconName: 'TrashIcon', color: ERROR_RED }}
      />

    </div>
  )
}
