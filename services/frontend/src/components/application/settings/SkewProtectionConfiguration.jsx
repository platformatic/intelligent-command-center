import React, { useEffect, useState } from 'react'
import { TRANSPARENT, BLACK_RUSSIAN, WHITE, MEDIUM, SMALL } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Forms, Icons, Button } from '@platformatic/ui-components'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import SaveButtons from './SaveButtons'
import useICCStore from '~/useICCStore'
import { getSkewProtectionPolicy, putSkewProtectionPolicy } from '~/api'
import styles from './SkewProtectionConfiguration.module.css'

// Each mode is a segmented option with a one-line caption of who owns what.
// Manage is hidden while its ICC-owned deploy path is being reworked.
const MODE_OPTIONS = [
  { label: 'Observe', value: 'observe', caption: 'ICC owns routing, you deploy.' },
  { label: 'Advise', value: 'advise', caption: 'ICC plans, an external actor applies.' }
]

export default function SkewProtectionConfiguration ({ applicationId }) {
  const { showSplashScreen } = useICCStore()
  const [overrides, setOverrides] = useState(null)
  const [enableSaveButton, setEnableSaveButton] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [mode, setMode] = useState('observe')
  const [requiresApproval, setRequiresApproval] = useState(false)

  async function loadPolicy () {
    const policy = await getSkewProtectionPolicy(applicationId)
    if (!policy) return
    setOverrides(policy.overrides)
    const effective = { ...policy.resolved, ...(policy.overrides ?? {}) }
    setEnabled(effective.enabled ?? true)
    setMode(effective.mode ?? 'observe')
    setRequiresApproval(effective.requiresApproval ?? false)
    setEnableSaveButton(false)
  }

  useEffect(() => {
    if (applicationId) loadPolicy()
  }, [applicationId])

  // Approval gates the route flip, so it only applies where ICC controls routing
  // (observe/manage). In advise ICC returns a plan and never flips the route, so
  // approval can't be enforced -- it's forced off and read-only there. All the
  // controls except the Enabled toggle are read-only while skew protection is off.
  const controlsDisabled = !enabled
  const approvalDisabled = controlsDisabled || mode === 'advise'
  const approvalChecked = mode === 'advise' ? false : requiresApproval

  async function save () {
    // Preserve any existing overrides (e.g. timing fields) and apply the changes.
    await putSkewProtectionPolicy(applicationId, {
      ...(overrides ?? {}),
      enabled,
      mode,
      requiresApproval: mode === 'advise' ? false : requiresApproval
    })
    showSplashScreen({
      title: 'Skew protection saved',
      content: 'The per-application skew protection settings were updated.',
      type: 'success',
      timeout: 3000,
      onDismiss: () => { loadPolicy() }
    })
  }

  return (
    <div>
      <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN}>
        <div className={`${commonStyles.smallFlexBlock}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
              <Icons.AppSettingsIcon color={WHITE} size={MEDIUM} />
              <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Skew Protection</p>
            </div>
            <SaveButtons enabled={enableSaveButton} onSaveButtonClicked={save} />
          </div>

          <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>
            Version routing and draining for this Watt. Available because the cluster skew-protection feature is enabled.
          </p>

          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${styles.row}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${styles.half}`}>
              <div className={commonStyles.tinyFlexBlock}>
                <p className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>Enabled</p>
                <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>Track versions and manage version routing for this application.</p>
              </div>
              <Forms.ToggleSwitch
                name='enabled'
                checked={enabled}
                size={SMALL}
                onChange={() => { setEnabled((value) => !value); setEnableSaveButton(true) }}
              />
            </div>
            <div className={styles.divider} />
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${styles.half}`}>
              <div className={`${commonStyles.tinyFlexBlock} ${approvalDisabled ? styles.dimmed : ''}`}>
                <p className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>Requires Approval</p>
                <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>New versions are staged off client traffic until a human approves them.{mode === 'advise' ? ' Not available in advise mode: ICC does not control routing.' : ''}</p>
              </div>
              <Forms.ToggleSwitch
                name='requiresApproval'
                checked={approvalChecked}
                size={SMALL}
                disabled={approvalDisabled}
                onChange={() => { setRequiresApproval((value) => !value); setEnableSaveButton(true) }}
              />
            </div>
          </div>

          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${styles.row}`}>
            <div className={`${styles.modeLabel} ${controlsDisabled ? styles.dimmed : ''}`}>
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
                    disabled={controlsDisabled}
                    selected={mode === option.value}
                    color={WHITE}
                    backgroundColor={TRANSPARENT}
                    fullWidth
                    bordered
                  />
                  <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite} ${controlsDisabled ? styles.dimmed : ''}`}>{option.caption}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BorderedBox>
    </div>
  )
}
