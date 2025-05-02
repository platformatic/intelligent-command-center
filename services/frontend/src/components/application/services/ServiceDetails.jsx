import React, { useEffect, useState } from 'react'
import { useParams, useRouteLoaderData } from 'react-router-dom'

import { BorderedBox, Icons } from '@platformatic/ui-components'
import { BLACK_RUSSIAN, MEDIUM, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import PanelCompliancyService from './PanelCompliancyService'
import { callApiGetApplicationsConfigs, callApiUpdateApplicationConfigs, getApiCompliancy } from '../../../api'
import Slider from '../settings/Slider'
import { getMaxValuesForResource, getTooltipTextForResource, getTresholdValuesForResource } from '../../../utilities/resources'
import SaveButtons from '../settings/SaveButtons'

import styles from './ServiceDetails.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import useICCStore from '../../../useICCStore'

export default function ServiceDetails () {
  const { application } = useRouteLoaderData('appRoot')
  const { serviceId } = useParams()
  const globalState = useICCStore()
  const { showSplashScreen } = globalState
  const [service, setService] = useState(null)
  const [appResources, setAppResources] = useState({})
  const [serviceResources, setServiceResources] = useState({})
  const [showComponent, setShowComponent] = useState(false)
  const [enableSaveButton, setEnableSaveButton] = useState(false)
  const [compliancyReport, setCompliancyReport] = useState(null)

  async function getApplicationResources () {
    const res = await callApiGetApplicationsConfigs(application.id)
    setAppResources(res)
    return res
  }

  function updateServiceResources (key, value) {
    setServiceResources({
      ...serviceResources,
      [key]: value
    })
  }

  async function onSaveButtonClicked () {
    const payload = appResources
    const servicesData = []
    if (Object.values(payload.services) === 0) {
      servicesData.push({
        name: service.id,
        ...serviceResources
      })
    } else {
      let serviceFound = false
      Object.values(payload.services).forEach((s, idx) => {
        if (s.name === service.id) {
          serviceFound = true
          servicesData.push({
            name: s.name,
            ...serviceResources
          })
        } else {
          servicesData.push(s)
        }
      })

      // The service didn't have the stored value yet
      if (!serviceFound) {
        servicesData.push({
          name: service.id,
          ...serviceResources
        })
      }
    }
    payload.services = servicesData

    await callApiUpdateApplicationConfigs(application.id, payload)
    showSplashScreen({
      title: 'Resources saved',
      content: 'Resources saved successfully and applied to the application',
      type: 'success',
      timeout: 3000,
      onDismiss: () => {
        getApplicationResources()
        setEnableSaveButton(false)
      }
    })
  }
  async function getServiceCompliancyReport () {
    const report = await getApiCompliancy(application.id)
    let services = {}
    if (report.length > 0) {
      const ruleSet = report[0].ruleSet
      const index = Object.keys(report[0].ruleSet).find(rule => report[0].ruleSet[rule].name === 'outdated-npm-deps')
      services = ruleSet[index]?.details?.services ?? {}
    }
    setCompliancyReport(services[serviceId] || {})
  }

  function getLabelForResource (s) {
    const map = {
      threads: 'Threads per service',
      heap: <span>Max Heap <span className={styles.unit}>(MB)</span></span>
    }
    return map[s]
  }

  function getResourcesForService () {
    const output = {
      threads: null,
      heap: null
    }
    const allServices = Object.values(appResources.services)
    if (allServices.length > 0) {
      const serviceResource = allServices.find((s) => s.name === serviceId)
      if (serviceResource) {
        output.threads = serviceResource.threads
        output.heap = serviceResource.heap
      } else {
        output.threads = appResources.threads
        output.heap = appResources.heap
      }
    } else {
      output.threads = appResources.threads
      output.heap = appResources.heap
    }
    return output
  }

  useEffect(() => {
    if (appResources.services) {
      const res = getResourcesForService()
      setServiceResources(res)
    }
  }, [appResources])

  useEffect(() => {
    if (Object.keys(serviceResources).length > 0) {
      setShowComponent(true)
    }
  }, [serviceResources])

  useEffect(() => {
    if (application) {
      getApplicationResources()
      const theService = application.state.services.find((s) => s.id === serviceId)
      setService(theService)
      getServiceCompliancyReport()
    }
  }, [application])

  function renderComponent () {
    if (serviceResources) {
      return (
        <div className={styles.resources}>
          {Object.entries(serviceResources).map(([key, value]) => {
            return (
              <div className={styles.rangeContainer} key={key}>
                <Slider
                  label={getLabelForResource(key)}
                  max={getMaxValuesForResource(key)}
                  value={value}
                  tooltipText={getTooltipTextForResource(key)}
                  treshold={getTresholdValuesForResource(key)}
                  onValueUpdated={(val) => {
                    updateServiceResources(key, val)
                    setEnableSaveButton(true)
                  }}
                />
              </div>

            )
          })}
        </div>
      )
    }
  }
  if (showComponent) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.ServiceIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>{serviceId}</p>
          </div>
        </div>

        <div className={styles.resources}>
          <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN}>

            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${commonStyles.fullWidth} ${styles.header}`}>
              <span className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Resources</span>
              <SaveButtons onSaveButtonClicked={onSaveButtonClicked} enabled={enableSaveButton} />

            </div>

            <div>
              {renderComponent()}
            </div>
          </BorderedBox>
        </div>

        {compliancyReport && (
          <div className={styles.compliancy}>
            <PanelCompliancyService key={`${new Date()}-${service.name}`} id={serviceId} reportServices={compliancyReport} />
          </div>
        )}
      </div>
    )
  }
}
