import React, { useEffect, useState } from 'react'
import { BorderedBox, Icons } from '@platformatic/ui-components'
import { BLACK_RUSSIAN, MEDIUM, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './Resources.module.css'
import { callApiGetApplicationsConfigs, callApiUpdateApplicationConfigs } from '../../../api'
import Slider from './Slider'
import { getMaxValuesForResource, getTooltipTextForResource, getTresholdValuesForResource } from '../../../utilities/resources'
import SaveButtons from './SaveButtons'
import useICCStore from '../../../useICCStore'

export default function Resources ({
  applicationId
}) {
  const [resources, setResources] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [enableSaveButton, setEnableSaveButton] = useState(false)
  const globalState = useICCStore()
  const { showSplashScreen } = globalState
  useEffect(() => {
    async function getApplicationSettings () {
      const json = await callApiGetApplicationsConfigs(applicationId)
      setResources(json)
    }

    getApplicationSettings()
  }, [])

  useEffect(() => {
    if (resources) {
      setShowForm(true)
    }
  }, [resources])

  async function updateResources () {
    const res = await callApiUpdateApplicationConfigs(applicationId, resources)
    if (res === true) {
      showSplashScreen({
        title: 'Resources saved',
        content: 'Resources saved successfully and applied to the application',
        type: 'success',
        timeout: 3000
      })
    }
  }

  function getLabelForResource (s) {
    const map = {
      threads: 'Threads per service',
      heap: <span>Max Heap <span className={styles.unit}>(MB)</span></span>
    }
    return map[s]
  }
  function handleInputChange (key, value) {
    setEnableSaveButton(true)
    const newValues = {
      ...resources,
      [key]: value
    }
    setResources(newValues)
  }
  function renderResources () {
    const output = []
    for (const s of ['threads', 'heap']) {
      output.push(
        <div key={`form_field_${s}`} className={styles.rangeContainer}>
          <Slider
            label={getLabelForResource(s)}
            max={getMaxValuesForResource(s)}
            onValueUpdated={(value) => { handleInputChange(s, value) }}
            value={resources[s]}
            treshold={getTresholdValuesForResource(s)}
            tooltipText={getTooltipTextForResource(s)}
          />
        </div>
      )
    }
    return output
  }
  return (
    <div>
      <BorderedBox
        color={TRANSPARENT}
        backgroundColor={BLACK_RUSSIAN}
        classes={styles.borderexBoxContainerEnvironmentVariables}
      >
        <div className={`${commonStyles.smallFlexBlock}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
              <Icons.GearIcon
                color={WHITE}
                size={MEDIUM}
              />
              <div>
                <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Resources</p>
              </div>
            </div>
            <SaveButtons enabled={enableSaveButton} onSaveButtonClicked={updateResources} />
          </div>
          <div className={`${styles.content}`}>
            <div className={`${styles.form}`}>
              {showForm && renderResources()}
            </div>
          </div>
        </div>
      </BorderedBox>
    </div>

  )
}
