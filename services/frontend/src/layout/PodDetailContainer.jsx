import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  PAGE_APPLICATION_DETAILS,
  PAGE_APPLICATION_DETAIL_SETTINGS,
  APPLICATION_DETAIL_PATH,
  APPLICATION_DETAIL_SETTINGS_PATH,
  HOME_PATH,
  PAGE_APPS,
  AUTOSCALER_POD_DETAIL_LOGS_PATH,
  APPLICATION_DETAIL_AUTOSCALER_PATH,
  PAGE_APPLICATION_DETAIL_AUTOSCALER,
  AUTOSCALER_POD_DETAIL_OVERVIEW_PATH,
  AUTOSCALER_POD_DETAIL_SERVICES_PATH
} from '~/ui-constants'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './HomeContainer.module.css'
import SideBar from '~/components/ui/SideBar'
import useICCStore from '~/useICCStore'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getApiApplication, getApiTaxonomy, getApiPods } from '~/api'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import ErrorComponent from '~/components/errors/ErrorComponent'

function AutoscalerPodDetailContainer ({ children }) {
  const globalState = useICCStore()
  const {
    breadCrumbs,
    setNavigation,
    currentPage,
    setCurrentPage,
    applicationSelected,
    podSelected,
    setApplicationSelected,
    setTaxonomyStatus,
    setTaxonomySelected,
    setPodSelected
  } = globalState
  const navigate = useNavigate()
  const { taxonomyId, appId, podId } = useParams()
  const [innerLoading, setInnerLoading] = useState(true)
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (breadCrumbs.length === 0) {
      setNavigation({
        label: 'Applications',
        handleClick: () => {
          navigate(HOME_PATH)
          setCurrentPage(PAGE_APPS)
        },
        key: PAGE_APPS,
        page: PAGE_APPS
      })
    }
  }, [])

  useEffect(() => {
    if (applicationSelected !== null) {
      setNavigation({
        label: applicationSelected.name,
        handleClick: () => handleNavigationClick(),
        key: PAGE_APPLICATION_DETAILS,
        page: PAGE_APPLICATION_DETAILS
      }, 1)
    }
  }, [applicationSelected])

  useEffect(() => {
    if (podSelected !== null) {
      setNavigation({
        label: 'Horizontal Pod Autoscaler',
        handleClick: () => handleNavigationToPreviousLevel(APPLICATION_DETAIL_AUTOSCALER_PATH, PAGE_APPLICATION_DETAIL_AUTOSCALER),
        key: PAGE_APPLICATION_DETAILS,
        page: PAGE_APPLICATION_DETAILS
      }, 3)

      setNavigation({
        label: `Pod Detail ${podId}`,
        handleClick: () => {
          setCurrentPage(AUTOSCALER_POD_DETAIL_OVERVIEW_PATH)
        },
        key: AUTOSCALER_POD_DETAIL_OVERVIEW_PATH,
        page: AUTOSCALER_POD_DETAIL_OVERVIEW_PATH
      }, 4)

      setInnerLoading(false)
    }
  }, [podSelected])

  useEffect(() => {
    if (taxonomyId && appId && podId) {
      async function loadTaxonomyAndApplicationId () {
        try {
          setInnerLoading(true)
          const taxonomySelected = await getApiTaxonomy(taxonomyId)
          setTaxonomySelected(taxonomySelected[0])
          setTaxonomyStatus(taxonomySelected[0]?.status ?? '-')
          const applicationSelected = await getApiApplication(appId)
          setApplicationSelected(applicationSelected)
          const pods = await getApiPods(appId, taxonomyId)
          setPodSelected(pods.find(pod => pod.id === podId))
        } catch (error) {
          console.error(`Error on getApiApplication ${error}`)
          setError(error)
          setShowErrorComponent(true)
        } finally {
          setInnerLoading(false)
        }
      }
      loadTaxonomyAndApplicationId()
    }
  }, [taxonomyId, appId, podId])

  function handleNavigationToPreviousLevel (path, page) {
    const newPath = path.replace(':taxonomyId', taxonomyId).replace(':appId', appId)
    navigate(newPath)
    setCurrentPage(page)
  }

  function handleNavigation (path) {
    const newPath = path.replace(':taxonomyId', taxonomyId).replace(':appId', appId).replace(':podId', podId)
    navigate(newPath)
    setCurrentPage(path)
  }

  function handleNavigationClick () {
    if ((applicationSelected?.deploymentsOnMainTaxonomy ?? 0) !== 0) {
      navigate(APPLICATION_DETAIL_PATH.replace(':taxonomyId', taxonomyId).replace(':appId', appId))
      setCurrentPage(PAGE_APPLICATION_DETAILS)
    }
  }

  function renderComponent () {
    if (showErrorComponent) {
      return <ErrorComponent error={error} message={error.message} onClickDismiss={() => setShowErrorComponent(false)} />
    }

    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading your application...'
            }, {
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
              text: 'This process will just take a few seconds.'
            }]
          }}
          containerClassName={styles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if ((applicationSelected?.deploymentsOnMainTaxonomy ?? 0) === 0 && !location.pathname.endsWith(PAGE_APPLICATION_DETAIL_SETTINGS)) {
      handleNavigation(APPLICATION_DETAIL_SETTINGS_PATH, PAGE_APPLICATION_DETAIL_SETTINGS)
      return
    }

    return children
  }

  return (
    <div className={styles.content}>
      <SideBar
        selected={currentPage}
        topItems={[{
          name: AUTOSCALER_POD_DETAIL_OVERVIEW_PATH,
          label: 'Overview',
          iconName: 'PodDetailsIcon',
          onClick: () => handleNavigation(AUTOSCALER_POD_DETAIL_OVERVIEW_PATH),
          disabled: (applicationSelected?.deploymentsOnMainTaxonomy ?? 0) === 0
        }, {
          name: AUTOSCALER_POD_DETAIL_SERVICES_PATH,
          label: 'Services',
          iconName: 'PodServicesIcon',
          onClick: () => handleNavigation(AUTOSCALER_POD_DETAIL_SERVICES_PATH),
          disabled: (applicationSelected?.deploymentsOnMainTaxonomy ?? 0) === 0
        }, {
          name: AUTOSCALER_POD_DETAIL_LOGS_PATH,
          label: 'Logs',
          iconName: 'PodLogsIcon',
          onClick: () => handleNavigation(AUTOSCALER_POD_DETAIL_LOGS_PATH),
          disabled: (applicationSelected?.deploymentsOnMainTaxonomy ?? 0) === 0
        }]}
        bottomItems={[{
          name: PAGE_APPLICATION_DETAIL_SETTINGS,
          label: 'Settings',
          iconName: 'AppSettingsIcon',
          onClick: () => handleNavigationToPreviousLevel(APPLICATION_DETAIL_SETTINGS_PATH, PAGE_APPLICATION_DETAIL_SETTINGS)
        }]}
      />
      {renderComponent()}
    </div>
  )
}

AutoscalerPodDetailContainer.propTypes = {
  /**
   * children
   */
  children: PropTypes.node
}

export default AutoscalerPodDetailContainer
