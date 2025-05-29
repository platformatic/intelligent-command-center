import React, { useState } from 'react'
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
import DoubleRangeSlider from './DoubleRangeSlider'
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
          <div className={styles.doubleRangeSlider}>
            <DoubleRangeSlider
              label='Number of usable pods'
              min={0}
              max={20}
              value={{ min: config.minPods, max: config.maxPods }}
              onChange={(key, value) => {
                if (key === 'min') {
                  handleInputChange('minPods', value)
                }
                if (key === 'max') {
                  handleInputChange('maxPods', value)
                }
              }}
            />
          </div>
        </div>
      </BorderedBox>
    </div>
  )
}
