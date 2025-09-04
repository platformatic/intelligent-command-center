import React, { useEffect, useState } from 'react'
import styles from './Navigation.module.css'
import { PlatformaticIcon } from '@platformatic/ui-components'
import { TINY, WHITE } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import { useLocation, useNavigate, useRouteLoaderData, useMatches, generatePath, useNavigation, useParams } from 'react-router-dom'
import dayjs from 'dayjs'

function getRootPageBreadcrumbs (routeId) {
  const output = []
  switch (routeId) {
    case 'root':
      output.push({ label: 'All Applications' })
      break
    case 'allApplications':
      output.push({ label: 'All Applications' })
      break
    case 'appDetails':
      output.push({ label: 'Recommendations' })
      break
    case 'settings':
      output.push({ label: 'Settings' })
      break
    case 'recommendationsHistory':
      output.push({ label: 'Recommendations History' })
      break
    case 'caching':
      output.push({ label: 'Caching' })
      break
    case 'previews':
      output.push({ label: 'Previews' })
      break
    case 'deployments':
      output.push({ label: 'Deployments' })
      break
    case 'ingressPaths':
      output.push({ label: 'Ingress Paths' })
      break
    case 'taxonomy':
      output.push({ label: 'Taxonomy' })
      break
  }
  return output
}
function getApplicationPageBreadcrumbs (routeId, application, otherParams) {
  const output = []
  output.push({
    label: 'All Applications',
    link: generatePath('/', {})
  })
  output.push({
    label: application.name,
    link: generatePath('/applications/:applicationId', { applicationId: application.id })
  })
  const flamegraphDate = dayjs(otherParams?.flamegraph?.createdAt).format('DD-MM-YYYY')
  switch (routeId) {
    case 'application/details':
      break
    case 'application/deployments':
      output.push({ label: 'Deployments' })
      break
    case 'application/deploymentHistory':
      output.push({ label: 'Deployment History' })
      break
    case 'application/services':
      output.push({ label: 'Services' })
      break
    case 'application/scheduled-jobs':
      output.push({ label: 'Scheduled Jobs' })
      break
    case 'application/scheduled-jobs-detail':
      output.push({ label: 'Scheduled Jobs', link: generatePath('/applications/:applicationId/scheduled-jobs', { applicationId: application.id }) })
      output.push({ label: otherParams.jobName })
      break
    case 'application/autoscaler':
      output.push({ label: 'Autoscaler' })
      break
    case 'application/settings':
      output.push({ label: 'Settings' })
      break
    case 'application/services/detail':
      output.push({ label: 'Services', link: generatePath('/applications/:applicationId/services', { applicationId: application.id }) })
      output.push({ label: otherParams.serviceId })
      break
    case 'autoscalerPodDetail/overview':
      output.push({ label: 'Autoscaler', link: generatePath('/applications/:applicationId/autoscaler', { applicationId: application.id }) })
      output.push({ label: otherParams.pod.id })
      break
    case 'autoscalerPodDetail/services':
      output.push({ label: 'Autoscaler', link: generatePath('/applications/:applicationId/autoscaler', { applicationId: application.id }) })
      output.push({ label: otherParams.pod.id })
      output.push({ label: 'Services' })
      break

    case 'application/flamegraphs':
      output.push({ label: 'Flamegraphs', link: generatePath('/applications/:applicationId/flamegraphs', { applicationId: application.id }) })
      break
    case 'autoscalerPodDetail/signalsHistory':
      output.push({ label: 'Autoscaler', link: generatePath('/applications/:applicationId/autoscaler', { applicationId: application.id }) })
      output.push({ label: otherParams.pod.id })
      output.push({ label: 'Signals History' })
      break
    case 'application/flamegraphs-detail':
      output.push({ label: 'Flamegraphs', link: generatePath('/applications/:applicationId/flamegraphs', { applicationId: application.id }) })
      output.push({ label: `[${flamegraphDate}] - ${otherParams.flamegraph.serviceId}` })
      break
  }
  return output
}

export default function Navigation () {
  const [breadCrumbs, setBreadCrumbs] = useState([])

  const appRootLoaderData = useRouteLoaderData('appRoot')
  const autoscalerPodDetailRootLoaderData = useRouteLoaderData('autoscalerPodDetailRoot')
  const location = useLocation()
  const routes = useMatches()
  const navigation = useNavigation()
  const routeId = routes[routes.length - 1].id
  const params = useRouteLoaderData(routeId) || {}
  // Add podId to params if it exists in the query params
  const queryParams = useParams()
  if (queryParams.podId) {
    params.pod = { id: queryParams.podId }
  }
  function getBreadCrumbs () {
    if (autoscalerPodDetailRootLoaderData) {
      const { application } = autoscalerPodDetailRootLoaderData
      const breadCrumbs = getApplicationPageBreadcrumbs(routeId, application, params)
      setBreadCrumbs(breadCrumbs)
    } else if (!appRootLoaderData) {
      // we are not in an application specific route
      const breadCrumbs = getRootPageBreadcrumbs(routeId)
      setBreadCrumbs(breadCrumbs)
    } else {
      const { application } = appRootLoaderData
      const breadCrumbs = getApplicationPageBreadcrumbs(routeId, application, params)
      setBreadCrumbs(breadCrumbs)
    }
  }
  useEffect(() => {
    getBreadCrumbs()
  }, [location.pathname])

  useEffect(() => {
    if (navigation.state === 'loading') {
      setBreadCrumbs([{
        label: 'Loading...',
        page: '#'
      }])
    } else {
      getBreadCrumbs()
    }
  }, [navigation.state])

  const navigate = useNavigate()

  function handleItemClick (item) {
    if (typeof item.handleClick === 'function') {
      return item.handleClick()
    } else {
      // navigate to the item page
      navigate(item.link)
    }
  }
  if (!breadCrumbs || breadCrumbs.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.breadCrumbs}>
        {breadCrumbs.map((item, index) => {
          let content
          if (index < breadCrumbs.length - 1) {
            content = <span onClick={() => handleItemClick(item)} key={item.label} className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${styles.link}`}><span>{item.label}</span></span>
          } else {
            content = <span key={item.label} className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{item.label}</span>
          }
          if (index < breadCrumbs.length - 1) {
            return (
              <span key={item.label} className={styles.navigationElement}>
                {content}
                <PlatformaticIcon className={styles.separator} iconName='ArrowRightIcon' size={TINY} color={WHITE} />
              </span>
            )
          }
          return content
        })}
      </div>
    </div>
  )
}
