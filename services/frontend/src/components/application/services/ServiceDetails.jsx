import React, { useEffect, useState } from 'react'
import useICCStore from '../../../useICCStore'
import { APPLICATION_DETAIL_SERVICES_PATH, APPLICATION_PATH, HOME_PATH, PAGE_APPLICATION_DETAILS, PAGE_APPLICATION_DETAILS_SERVICE_DETAIL, PAGE_APPLICATION_DETAILS_SERVICES, PAGE_APPS } from '../../../ui-constants'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './ServiceDetails.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, Icons } from '@platformatic/ui-components'
import { BLACK_RUSSIAN, MEDIUM, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import PanelCompliancyService from './PanelCompliancyService'
import { callApiDeployApplication, callApiGetApplicationSettings, callApiUpdateApplicationSettings, getApiApplication, getApiCompliancy } from '../../../api'
import Slider from '../settings/Slider'
import { getMaxValuesForResource, getTooltipTextForResource, getTresholdValuesForResource } from '../../../utilities/resources'
import SplashScreen from '../../common/SplashScreen'
import ConfirmationModal from '../../common/ConfirmationModal'
import SaveButtons from '../settings/SaveButtons'
export default function ServiceDetails () {
  const globalState = useICCStore()
  const { setFullNavigation, setCurrentPage, applicationSelected, setApplicationSelected, popNavigation } = globalState
  const [service, setService] = useState(null)
  const [appResources, setAppResources] = useState({})
  const [serviceResources, setServiceResources] = useState({})
  const [showComponent, setShowComponent] = useState(false)
  const [enableSaveButton, setEnableSaveButton] = useState(false)
  const [compliancyReport, setCompliancyReport] = useState(null)
  const [showSplashScreen, setShowSplashScreen] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  const navigate = useNavigate()
  const { serviceId, taxonomyId, appId } = useParams()

  async function getApplicationResources () {
    const res = await callApiGetApplicationSettings(appId)
    setAppResources(res)
    return res
  }

  function updateServiceResources (key, value) {
    setServiceResources({
      ...serviceResources,
      [key]: value
    })
  }

  async function deployWithNewSettings () {
    setShowConfirmationModal(false)
    callApiDeployApplication(applicationSelected.id)
    setShowSplashScreen(true)
  }
  async function onSaveButtonClicked (deploy) {
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

    await callApiUpdateApplicationSettings(applicationSelected.id, payload)
    window.alert('Resources saved')
    if (deploy) {
      setShowConfirmationModal(true)
    }
    getApplicationResources()
    setEnableSaveButton(false)
  }
  async function getServiceCompliancyReport () {
    const report = await getApiCompliancy(taxonomyId, appId)
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
  useEffect(() => {
    async function loadApplication () {
      try {
        const app = await getApiApplication(appId)
        setApplicationSelected(app)
      } catch (error) {
        console.error(`Error on getApiApplication ${error}`)
      }
    }
    if (appId) {
      if (!applicationSelected) {
        loadApplication()
      }
    }
  }, [appId])

  useEffect(() => {
    if (applicationSelected) {
      setFullNavigation([{
        label: 'Applications',
        handleClick: () => {
          navigate(HOME_PATH)
          setCurrentPage(PAGE_APPS)
        },
        key: PAGE_APPS,
        page: PAGE_APPS
      }, {
        label: applicationSelected.name,
        handleClick: () => {
          navigate(APPLICATION_PATH.replace(':taxonomyId', taxonomyId).replace(':appId', appId))
          setCurrentPage(PAGE_APPLICATION_DETAILS)
        },
        key: PAGE_APPLICATION_DETAILS,
        page: PAGE_APPLICATION_DETAILS
      }, {
        label: 'Services',
        handleClick: () => {
          popNavigation()
          navigate(APPLICATION_DETAIL_SERVICES_PATH.replace(':taxonomyId', taxonomyId).replace(':appId', appId))
          setCurrentPage(PAGE_APPLICATION_DETAILS_SERVICES)
        },
        key: PAGE_APPLICATION_DETAILS_SERVICES,
        page: PAGE_APPLICATION_DETAILS_SERVICES
      }, {
        label: serviceId,
        handleClick: () => {
          setCurrentPage(PAGE_APPLICATION_DETAILS_SERVICE_DETAIL)
        },
        key: PAGE_APPLICATION_DETAILS_SERVICE_DETAIL,
        page: PAGE_APPLICATION_DETAILS_SERVICE_DETAIL
      }])
      setCurrentPage(PAGE_APPLICATION_DETAILS_SERVICE_DETAIL)
      getServiceCompliancyReport()
      getApplicationResources()
    }
  }, [applicationSelected])
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
    if (applicationSelected) {
      getApplicationResources()
      const theService = applicationSelected.state.services.find((s) => s.id === serviceId)
      setService(theService)
    }
  }, [applicationSelected])

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
        {showSplashScreen && (
          <SplashScreen
            title='Replica set deployed'
            message='You successfully deploy the replica set with the new resources.'
            onDestroyed={() => setShowSplashScreen(false)}
          />
        )}

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
