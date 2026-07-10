import React, { useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './Settings.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import {
  MEDIUM,
  WHITE
} from '@platformatic/ui-components/src/components/constants'

import AutoscalerConfigration from './AutoscalerConfigration'
import SkewProtectionConfiguration from './SkewProtectionConfiguration'
import ActuationModeConfiguration from './ActuationModeConfiguration'
import DeployTokensConfiguration from './DeployTokensConfiguration'
import { useRouteLoaderData } from 'react-router-dom'
import useICCStore from '~/useICCStore'

export default function Settings () {
  const { application } = useRouteLoaderData('appRoot')
  const { config } = useICCStore()
  const isDeployed = application.isDeployed

  const sections = []
  // Autoscaler, skew and actuation config all describe a running workload, so
  // they only apply once the Watt is deployed. A not-yet-deployed Watt shows
  // just Deploy Tokens -- the credential needed to bring it online.
  if (isDeployed) {
    sections.push({ label: 'Autoscaler Configuration', component: <AutoscalerConfigration applicationId={application.id} />, icon: Icons.AppSettingsIcon })
    // Skew Protection is version-routing config and stays gated on the global flag;
    // it also owns the actuation-mode selector. When skew is off, expose the mode
    // on its own so deploy-token deploys can still be driven to manage/advise.
    if (config['skew-protection']) {
      sections.push({ label: 'Skew Protection', component: <SkewProtectionConfiguration applicationId={application.id} />, icon: Icons.DeploymentHistoryIcon })
    } else {
      sections.push({ label: 'Deployment Mode', component: <ActuationModeConfiguration applicationId={application.id} />, icon: Icons.DeploymentHistoryIcon })
    }
  }
  // Deploy Tokens are a general "deploy to ICC" capability, independent of skew.
  sections.push({ label: 'Deploy Tokens', component: <DeployTokensConfiguration applicationId={application.id} />, icon: Icons.KeyIcon })

  const [currentSection, setCurrentSection] = useState(isDeployed ? 'Autoscaler Configuration' : 'Deploy Tokens')
  return (
    <div className={styles.container}>
      <div className={styles.leftPane}>
        <div className={styles.header}>
          <Icons.AppSettingsIcon color={WHITE} size={MEDIUM} />
          <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Watt Settings</p>
        </div>
        <hr />
        <div className={styles.sections}>
          <ul>
            {sections.map((section) => (
              <li key={section.label}>
                <div onClick={() => setCurrentSection(section.label)} className={currentSection === section.label ? styles.selected : ''}>
                  <section.icon color={WHITE} size={MEDIUM} />
                  {section.label}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={styles.rightPane}>
        {sections.find((section) => section.label === currentSection)?.component}
      </div>
    </div>
  )
}
