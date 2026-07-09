import React from 'react'
import { Button } from '@platformatic/ui-components'
import { WHITE, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { copyValue } from '~/utils'
import styles from './PlanView.module.css'

// Read-only advised plan: the steps ICC would apply, each with a copyable command
// and manifest. Shared by the Version Manager (skew on) and the Deployments view
// (skew off), so the plan renders identically wherever it is surfaced.
export default function PlanView ({ steps = [], action = 'apply', versionLabel = '' }) {
  return (
    <div className={`${styles.plan} ${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
      <p className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>
        Plan for {action} {versionLabel} - run these against the cluster:
      </p>
      {steps.length === 0 && (
        <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>No steps.</p>
      )}
      {steps.map((step, index) => (
        <div key={index} className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth} ${styles.planStep}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
            <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>
              {step.kind} / {step.action}{step.description ? ` - ${step.description}` : ''}
            </span>
            {step.command && (
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                <span className={`${typographyStyles.terminal} ${styles.planCommand}`}>{step.command}</span>
                <Button
                  textClass={typographyStyles.desktopButtonSmall}
                  paddingClass={commonStyles.smallButtonPadding}
                  label='Copy Command'
                  onClick={() => copyValue(step.command)}
                  color={WHITE}
                  backgroundColor={TRANSPARENT}
                  bordered
                />
              </div>
            )}
          </div>
          {step.manifest && (
            <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>Manifest (pipe into command above)</span>
                <Button
                  textClass={typographyStyles.desktopButtonSmall}
                  paddingClass={commonStyles.smallButtonPadding}
                  label='Copy Manifest'
                  onClick={() => copyValue(step.manifest)}
                  color={WHITE}
                  backgroundColor={TRANSPARENT}
                  bordered
                />
              </div>
              <pre className={`${typographyStyles.terminal} ${styles.planManifest}`}>{JSON.stringify(step.manifest, null, 2)}</pre>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
