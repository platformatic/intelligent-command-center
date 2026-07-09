import React, { useEffect, useState } from 'react'
import { TRANSPARENT, BLACK_RUSSIAN, WHITE, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Icons, Button } from '@platformatic/ui-components'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import SaveButtons from './SaveButtons'
import useICCStore from '~/useICCStore'
import { getActuationMode, putActuationMode } from '~/api'
import styles from './SkewProtectionConfiguration.module.css'

// The actuation mode is skew-independent: it decides who owns the workload when
// you deploy with a deploy token. This standalone section is shown when skew
// protection is off (when it is on, the same mode lives in the Skew Protection
// section). Captions describe the skew-off behavior -- no version routing.
// Manage is hidden while its ICC-owned deploy path is being reworked.
const MODE_OPTIONS = [
  { label: 'Observe', value: 'observe', caption: 'You own the workload; ICC deploys nothing.' },
  { label: 'Advise', value: 'advise', caption: 'ICC returns manifests to apply yourself; it does not track or confirm them.' }
]

export default function ActuationModeConfiguration ({ applicationId }) {
  const { showSplashScreen } = useICCStore()
  const [mode, setMode] = useState('observe')
  const [enableSaveButton, setEnableSaveButton] = useState(false)

  async function loadMode () {
    const res = await getActuationMode(applicationId)
    if (!res) return
    setMode(res.mode ?? 'observe')
    setEnableSaveButton(false)
  }

  useEffect(() => {
    if (applicationId) loadMode()
  }, [applicationId])

  async function save () {
    await putActuationMode(applicationId, mode)
    showSplashScreen({
      title: 'Deployment mode saved',
      content: 'The deployment mode for this application was updated.',
      type: 'success',
      timeout: 3000,
      onDismiss: () => { loadMode() }
    })
  }

  return (
    <div>
      <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN}>
        <div className={`${commonStyles.smallFlexBlock}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
              <Icons.AppSettingsIcon color={WHITE} size={MEDIUM} />
              <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Deployment Mode</p>
            </div>
            <SaveButtons enabled={enableSaveButton} onSaveButtonClicked={save} />
          </div>

          <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>
            Who owns the workload when you deploy with a deploy token.
          </p>

          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${styles.row}`}>
            <div className={styles.modeLabel}>
              <p className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>Mode</p>
            </div>
            <div className={styles.modeOptions}>
              {MODE_OPTIONS.map((option) => (
                <div key={option.value} className={styles.modeOption}>
                  <Button
                    textClass={typographyStyles.desktopButtonSmall}
                    paddingClass={commonStyles.smallButtonPadding}
                    label={option.label}
                    onClick={() => { setMode(option.value); setEnableSaveButton(true) }}
                    selected={mode === option.value}
                    color={WHITE}
                    backgroundColor={TRANSPARENT}
                    fullWidth
                    bordered
                  />
                  <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>{option.caption}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BorderedBox>
    </div>
  )
}
