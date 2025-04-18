import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  PAGE_APPLICATION_DETAIL_SETTINGS,
  APPLICATION_DETAIL_SETTINGS_PATH,
  PREVIEWS_PATH,
  PAGE_PREVIEWS,
  PREVIEW_POD_DETAIL_OVERVIEW_PATH,
  PREVIEW_POD_DETAIL_SERVICES_PATH,
  PREVIEW_POD_DETAIL_LOGS_PATH,
  PREVIEWS_DETAIL_PATH
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

function PreviewPodDetailContainer ({ children }) {
  const globalState = useICCStore()
  const {
    breadCrumbs,
    setNavigation,
    currentPage,
    setCurrentPage,
    applicationSelected,
    podSelected,
    setApplicationSelected,
    taxonomySelected,
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
        label: 'Previews',
        handleClick: () => {
          navigate(PREVIEWS_PATH)
          setCurrentPage(PAGE_PREVIEWS)
        },
        key: PAGE_PREVIEWS,
        page: PAGE_PREVIEWS
      })
    }
  }, [])

  useEffect(() => {
    if (taxonomySelected !== null && applicationSelected !== null) {
      setNavigation({
        label: taxonomySelected.name,
        handleClick: () => handleNavigationClick(),
        key: PREVIEWS_DETAIL_PATH,
        page: PREVIEWS_DETAIL_PATH
      }, 1)
    }
  }, [taxonomySelected, applicationSelected])

  useEffect(() => {
    if (podSelected !== null) {
      setNavigation({
        label: `Pod Detail ${podId}`,
        handleClick: () => {
          setCurrentPage(PREVIEW_POD_DETAIL_OVERVIEW_PATH)
        },
        key: PREVIEW_POD_DETAIL_OVERVIEW_PATH,
        page: PREVIEW_POD_DETAIL_OVERVIEW_PATH
      }, 3)

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
      navigate(PREVIEWS_DETAIL_PATH.replace(':taxonomyId', taxonomyId))
      setCurrentPage(PAGE_PREVIEWS)
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
          name: PREVIEW_POD_DETAIL_OVERVIEW_PATH,
          label: 'Overview',
          iconName: 'PodDetailsIcon',
          onClick: () => handleNavigation(PREVIEW_POD_DETAIL_OVERVIEW_PATH),
          disabled: (applicationSelected?.deploymentsOnMainTaxonomy ?? 0) === 0
        }, {
          name: PREVIEW_POD_DETAIL_SERVICES_PATH,
          label: 'Services',
          iconName: 'PodServicesIcon',
          onClick: () => handleNavigation(PREVIEW_POD_DETAIL_SERVICES_PATH),
          disabled: (applicationSelected?.deploymentsOnMainTaxonomy ?? 0) === 0
        }, {
          name: PREVIEW_POD_DETAIL_LOGS_PATH,
          label: 'Logs',
          iconName: 'PodLogsIcon',
          onClick: () => handleNavigation(PREVIEW_POD_DETAIL_LOGS_PATH),
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

PreviewPodDetailContainer.propTypes = {
  /**
   * children
   */
  children: PropTypes.node
}

export default PreviewPodDetailContainer
