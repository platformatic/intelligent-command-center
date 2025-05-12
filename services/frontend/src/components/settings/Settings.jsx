import React, { useEffect, useState } from 'react'
import { WHITE, TRANSPARENT, ACTIVE_AND_INACTIVE_STATUS, SMALL, MARGIN_0, OPACITY_30, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import styles from './Settings.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import Users from './users/Users'
import Environments from './environments/Environments'
import Exports from './sync/Exports'
import Imports from './sync/Imports'
import SystemJobs from './system-jobs/SystemJobs'
import { Button, HorizontalSeparator } from '@platformatic/ui-components'
import { callApiGetSyncConfig } from '~/api'

const Settings = React.forwardRef(({ _ }, ref) => {
  const [component, setComponent] = useState(<Users key='users' />)
  const [syncConfig, setSyncConfig] = useState({})
  const [syncEnabled, setSyncEnabled] = useState(false)

  // sync might be not configured (so we don't show the button).
  // If it is configured, we show the button that redirect to import
  // or export depending on the configuration
  useEffect(() => {
    const fetchSyncConfig = async () => {
      const response = await callApiGetSyncConfig()
      setSyncConfig(response)
      setSyncEnabled(true)
    }
    fetchSyncConfig()
  }, [])

  const isImport = syncConfig?.enabled && syncConfig?.isImporter

  let SyncPanel = Exports
  let syncTitle = 'Export Base Data'
  let iconName = 'ExportIcon'
  if (isImport) {
    SyncPanel = Imports
    syncTitle = 'Import Base Data'
    iconName = 'ImportIcon'
  }

  function renderComponents () {
    return (
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        <Button
          label='Users'
          type='button'
          color={WHITE}
          backgroundColor={TRANSPARENT}
          hoverEffect={component.key === 'users' ? '' : ACTIVE_AND_INACTIVE_STATUS}
          paddingClass={commonStyles.smallButtonPaddingNoVerticalPadding}
          textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
          onClick={() => setComponent(<Users key='users' />)}
          bordered={false}
          platformaticIcon={{ iconName: 'TeamsIcon', color: WHITE, size: SMALL }}
        />
        <Button
          label='Environment'
          type='button'
          color={WHITE}
          backgroundColor={TRANSPARENT}
          hoverEffect={component.key === 'environments' ? '' : ACTIVE_AND_INACTIVE_STATUS}
          paddingClass={commonStyles.smallButtonPaddingNoVerticalPadding}
          textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
          onClick={() => setComponent(<Environments key='environments' />)}
          bordered={false}
          platformaticIcon={{ iconName: 'ComputerIcon', color: WHITE, size: SMALL }}
        />

        {syncEnabled && (
          <Button
            label={syncTitle}
            type='button'
            color={WHITE}
            backgroundColor={TRANSPARENT}
            hoverEffect={component.key === 'sync' ? '' : ACTIVE_AND_INACTIVE_STATUS}
            paddingClass={commonStyles.smallButtonPaddingNoVerticalPadding}
            textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
            onClick={() => setComponent(<SyncPanel key='sync' config={syncConfig} />)}
            bordered={false}
            platformaticIcon={{ iconName, color: WHITE, size: SMALL }}
          />)}

        <Button
          label='System Jobs'
          type='button'
          color={WHITE}
          backgroundColor={TRANSPARENT}
          hoverEffect={component.key === 'systemjobs' ? '' : ACTIVE_AND_INACTIVE_STATUS}
          paddingClass={commonStyles.smallButtonPaddingNoVerticalPadding}
          textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
          onClick={() => setComponent(<SystemJobs key='systemjobs' />)}
          bordered={false}
          platformaticIcon={{ iconName: 'ScheduledJobSettingsIcon', color: WHITE, size: SMALL }}
        />

      </div>
    )
  }

  return (
    <div className={styles.settingsContainer} ref={ref}>
      <div className={styles.settingsContent}>
        <div className={`${commonStyles.largeFlexRow} ${commonStyles.itemsStart}`}>
          <div className={`${commonStyles.smallFlexBlock} ${commonStyles.itemsCenter} ${styles.settingsLeftContainer}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
              <Icons.GearIcon color={WHITE} size={MEDIUM} />
              <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Settings</p>
            </div>
            <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />
            {renderComponents()}
          </div>
          {component}
        </div>
      </div>
    </div>
  )
})

export default Settings
