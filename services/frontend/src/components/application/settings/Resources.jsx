import React, { useEffect, useState } from 'react'
import { BorderedBox, Icons } from '@platformatic/ui-components'
import { BLACK_RUSSIAN, MEDIUM, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './Resources.module.css'
import { callApiGetApplicationSettings, callApiUpdateApplicationSettings, callApiDeployApplication } from '../../../api'
import Slider from './Slider'
import ConfirmationModal from '../../common/ConfirmationModal'
import SplashScreen from '../../common/SplashScreen'
import { getMaxValuesForResource, getTooltipTextForResource, getTresholdValuesForResource } from '../../../utilities/resources'
import SaveButtons from './SaveButtons'

export default function Resources ({
  applicationId
}) {
  const [resources, setResources] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showDeploySplashScreen, setShowDeploySplashScreen] = useState(false)
  const [enableSaveButton, setEnableSaveButton] = useState(false)

  useEffect(() => {
    async function getApplicationSettings () {
      const json = await callApiGetApplicationSettings(applicationId)
      setResources(json)
    }

    getApplicationSettings()
  }, [])

  useEffect(() => {
    if (resources) {
      setShowForm(true)
    }
  }, [resources])

  async function deployWithNewSettings () {
    setShowConfirmationModal(false)
    callApiDeployApplication(applicationId)
    setShowDeploySplashScreen(true)
  }
  async function updateResources (deploy = false) {
    const res = await callApiUpdateApplicationSettings(applicationId, resources)
    if (res === true) {
      if (deploy) {
        setShowConfirmationModal(true)
      } else {
        window.alert('Resources saved')
      }
    }
  }

  function getLabelForResource (s) {
    const map = {
      cores: 'Number of Cores',
      threads: 'Threads per service',
      heap: <span>Max Heap <span className={styles.unit}>(MB)</span></span>,
      memory: <span>Max Memory <span className={styles.unit}>(MB)</span></span>
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
    for (const s of ['cores', 'threads', 'heap', 'memory']) {
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
      {showDeploySplashScreen && (
        <SplashScreen
          title='Replica set deployed'
          message='You successfully deploy the replica set with the new resources.'
          onDestroyed={() => setShowDeploySplashScreen(false)}
        />
      )}
      {showConfirmationModal && (
        <ConfirmationModal
          setIsOpen={setShowConfirmationModal}
          onProceed={deployWithNewSettings}
          title='Save and Deploy'
          buttonText='Save and Deploy'
          text={
            <div>
              <p>By clicking “Save and Deploy” you will deploy the entire Replica Set.</p>
              <br />
              <p>Are you sure you want to continue?</p>
            </div>
          }
        />
      )}
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
