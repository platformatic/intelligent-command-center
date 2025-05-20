import React, { useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './Settings.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import {
  MEDIUM,
  WHITE
} from '@platformatic/ui-components/src/components/constants'

import Resources from './Resources'
import AutoscalerConfigration from './AutoscalerConfigration'
import { useRouteLoaderData } from 'react-router-dom'

export default function Settings () {
  const [currentSection, setCurrentSection] = useState('Autoscaler Configuration')
  const { application } = useRouteLoaderData('appRoot')

  const sections = [
    { label: 'Resources', component: <Resources applicationId={application.id} />, icon: Icons.ConfigureDatabaseIcon },
    { label: 'Autoscaler Configuration', component: <AutoscalerConfigration applicationId={application.id} />, icon: Icons.AppSettingsIcon }
  ]
  return (
    <div className={styles.container}>
      <div className={styles.leftPane}>
        <div className={styles.header}>
          <Icons.AppSettingsIcon color={WHITE} size={MEDIUM} />
          <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>App Settings</p>
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
