import React, { useState } from 'react'
import Slider from './Slider'
import { useLoaderData } from 'react-router-dom'
import { TRANSPARENT, BLACK_RUSSIAN, WHITE, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox } from '@platformatic/ui-components'

import Icons from '@platformatic/ui-components/src/components/icons'
import commonStyles from '~/styles/CommonStyles.module.css'
import SaveButtons from './SaveButtons'
import typographyStyles from '~/styles/Typography.module.css'
import callApi from '../../../api/common'
import useICCStore from '../../../useICCStore'

import styles from './AutoscalerConfiguration.module.css'
export default function AutoscalerConfigration ({ applicationId }) {
  const { scaleConfig } = useLoaderData()
  const { showSplashScreen } = useICCStore()
  const [enableSaveButton, setEnableSaveButton] = useState(false)
  const [config, setConfig] = useState(scaleConfig)

  async function reloadConfig () {
    const res = await callApi('scaler', `applications/${applicationId}/scale-configs`, 'GET')
    setConfig(res)
  }
  function handleInputChange (key, value) {
    if (key === 'minPods') {
      if (value > config.maxPods) {
        config.maxPods = value
      }
    }
    if (key === 'maxPods') {
      if (value < config.minPods) {
        config.minPods = value
      }
    }
    setEnableSaveButton(true)
    const newValues = {
      ...config,
      [key]: value
    }
    setConfig(newValues)
  }
  async function updateScaleConfig () {
    const postRes = await callApi('scaler', `applications/${applicationId}/scale-configs`, 'POST', {
      minPods: config.minPods,
      maxPods: config.maxPods
    })
    if (postRes && postRes.success) {
      showSplashScreen({
        title: 'Resources saved',
        content: 'Resources saved successfully and applied to the application',
        type: 'success',
        timeout: 3000,
        onDismiss: () => {
          reloadConfig()
        }
      })
    }
  }
  return (
    <div>
      <BorderedBox
        color={TRANSPARENT}
        backgroundColor={BLACK_RUSSIAN}
      >
        <div className={`${commonStyles.smallFlexBlock}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
              <Icons.AppSettingsIcon
                color={WHITE}
                size={MEDIUM}
              />
              <div>
                <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Autoscaler Configuration</p>
              </div>
            </div>
            <SaveButtons enabled={enableSaveButton} onSaveButtonClicked={updateScaleConfig} />
          </div>
          <div className={styles.sliders}>
            <Slider
              label='Min number of pods'
              max={20}
              onValueUpdated={(value) => { handleInputChange('minPods', value) }}
              value={config.minPods}
            />
            <Slider
              label='Max number of pods'
              max={20}
              onValueUpdated={(value) => { handleInputChange('maxPods', value) }}
              value={config.maxPods}
            />
          </div>
        </div>
      </BorderedBox>
    </div>
  )
}
