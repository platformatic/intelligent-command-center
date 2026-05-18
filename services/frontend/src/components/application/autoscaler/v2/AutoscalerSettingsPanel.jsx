import React from 'react'
import { PlatformaticIcon } from '@platformatic/ui-components'
import { MEDIUM, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './AutoscalerSettingsPanel.module.css'

export default function AutoscalerSettingsPanel ({
  settingsSections = [],
  collapsedSections = {},
  onToggleSection = () => {},
  onClose = () => {},
  formatValue = (value) => value
}) {
  return (
    <div className={styles.settingsOverlay}>
      <button
        type='button'
        className={styles.settingsBackdrop}
        onClick={onClose}
        aria-label='Close autoscaler settings'
      />
      <div className={styles.settingsPanel}>
        <div className={styles.settingsPanelHeader}>
          <PlatformaticIcon
            iconName='CloseIcon'
            color={WHITE}
            size={MEDIUM}
            onClick={onClose}
            internalOverHandling
          />
        </div>
        <div className={styles.settingsPaneContent}>
          <h1 className={`${typographyStyles.desktopHeadingH4} ${styles.settingsPaneTitle}`}>
            <PlatformaticIcon iconName='GearIcon' color={WHITE} size={MEDIUM} />
            Autoscaler Configuration
          </h1>
          <div className={styles.settingsSections}>
            {settingsSections.map(section => {
              const isLoadPredictorSection = section.title.startsWith('LoadPredictor')
              const isCollapsed = isLoadPredictorSection ? !!collapsedSections[section.id] : false

              return (
                <div key={section.id} className={styles.settingsSection}>
                  <button
                    type='button'
                    className={`${styles.sectionHeader} ${isLoadPredictorSection ? styles.sectionHeaderCollapsible : styles.sectionHeaderStatic}`}
                    onClick={() => isLoadPredictorSection && onToggleSection(section.id)}
                    disabled={!isLoadPredictorSection}
                    aria-expanded={!isCollapsed}
                  >
                    <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{section.title}</span>
                    {isLoadPredictorSection && (
                      <PlatformaticIcon
                        iconName={isCollapsed ? 'ArrowRightIcon' : 'ArrowDownIcon'}
                        color={WHITE}
                        size={SMALL}
                        internalOverHandling
                      />
                    )}
                  </button>

                  {!isCollapsed && (
                    <div className={styles.entriesList}>
                      {(section.entries || []).map(entry => (
                        <div key={entry.key} className={styles.entryRow}>
                          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${styles.entryKey}`}>
                            {entry.key}
                          </span>
                          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.entryValue}`}>
                            {formatValue(entry)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
