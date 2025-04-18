import { Button } from '@platformatic/ui-components'
import { RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'
import styles from './SaveButtons.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import React from 'react'

export default function SaveButtons ({
  enabled,
  onSaveButtonClicked = (deploy) => {}
}) {
  return (
    <div className={`${styles.buttons}`}>
      <Button
        textClass={typographyStyles.desktopButtonSmall}
        paddingClass={commonStyles.smallButtonPadding}
        onClick={() => onSaveButtonClicked(false)}
        label='Save'
        color={RICH_BLACK}
        backgroundColor={WHITE}
        disabled={!enabled}
      />
      <Button
        textClass={typographyStyles.desktopButtonSmall}
        paddingClass={commonStyles.smallButtonPadding}
        onClick={() => onSaveButtonClicked(true)}
        label='Save and Re-Deploy'
        color={WHITE}
        backgroundColor={RICH_BLACK}
        bordered
        disabled={!enabled}
      />
    </div>
  )
}
