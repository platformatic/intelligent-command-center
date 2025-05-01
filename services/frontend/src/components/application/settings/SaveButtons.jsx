import { Button } from '@platformatic/ui-components'
import { RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'
import styles from './SaveButtons.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import React from 'react'

export default function SaveButtons ({
  enabled,
  onSaveButtonClicked = () => {}
}) {
  return (
    <div className={`${styles.buttons}`}>
      <Button
        textClass={typographyStyles.desktopButtonSmall}
        paddingClass={commonStyles.smallButtonPadding}
        onClick={() => onSaveButtonClicked()}
        label='Save'
        color={RICH_BLACK}
        backgroundColor={WHITE}
        disabled={!enabled}
      />
    </div>
  )
}
