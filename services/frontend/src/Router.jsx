import React from 'react'
import { createHashRouter, useNavigate, useRouteError } from 'react-router-dom'
import ErrorComponent from './components/errors/ErrorComponent'
import PrivateRouteContainer from './layout/PrivateRouteContainer'
import HomeContainer from './layout/HomeContainer'
import AllWatts from './components/applications/all/AllWatts'
import RecommendationsHistory from './components/recommendations/RecommendationHistory'
import Settings from './components/settings/Settings'
import Profile from './components/profile/Profile'

import { getApiActivities, getApiActivitiesUsers, getApiDeploymentsHistory, getApiApplication, getApiActivitiesTypes, getApplicationsRaw, getApiPod, getKubernetesResources } from './api'
import { getPodSignals } from './api/autoscaler'
import callApi from './api/common'

import Activities from '~/components/application/activities/Activities'
import DeploymentHistory from '~/components/application/deployment_history/DeploymentHistory'
import AppDetails from '~/components/application/detail/AppDetails'
import WattContainer from '~/layout/WattContainer'
import AutoscalerPodDetailContainer from '~/layout/AutoscalerPodDetailContainer'

// Import Root Pages
import Taxonomy from './components/taxonomy/Taxonomy'
import Caching from './components/caching/Caching'
import AllDeployments from './components/deployments/AllDeployments'
import AllActivities from './components/activities/Activities'
import Services from './components/application/services/Services'
import ErrorPage from './pages/ErrorPage'

// Import App Details Pages
import ScheduledJobs from './components/scheduled-jobs/ScheduledJobs'
import ScheduledJobDetail from './components/scheduled-jobs/ScheduledJobDetail'
import Autoscaler from './components/application/autoscaler/Autoscaler'
import ApplicationSettings from './components/application/settings/Settings'
import NotFound from './pages/NotFound'
import ServiceDetails from './components/application/services/ServiceDetails'
import Flamegraphs from './components/application/flamegraphs/Flamegraphs'

// Import Autoscaler Pod Detail Pages
import PodOverview from './components/pods/detail/PodOverview'
import PodServicesCharts from './components/pods/detail/PodServicesCharts'
import FlamegraphDetail from './components/application/flamegraphs/FlamegraphDetail'
import PodSignalsHistory from './components/application/autoscaler/PodSignalsHistory'

// Import Flamegraph utils
import { fetchProfile } from 'react-pprof'
export function getRouter () {
  // TODO: check if this is needed
  // import useErrorBoundary from 'use-error-boundary'
  // const {
  //   ErrorBoundary,
  //   error
  // } = useErrorBoundary({
  //   onDidCatch: (error) => {
  //     setShowErrorComponent(true)
  //     console.error(error)
  //   }
  // })

  // const routesObject = createRoutesFromElements(
  //   <>
  //     <Route
  //       path={PREVIEWS_DETAIL_PATH}
  //       element={
  //         <PrivateRouteContainer>
  //           <HomeContainer>
  //             <DetailPreview
  //               ref={previewDetailRef}
  //               key={PAGE_PREVIEWS}
  //             />
  //           </HomeContainer>
  //         </PrivateRouteContainer>
  //           }
  //     />
  //     {/* Application Container Routes */}
  //     {/* Autoscaler Pod Detail Container Routes */}

  //     {/* Error and Not Found Routes */}
  //     <Route
  //       path={APPLICATION_DETAIL_SERVICE_DETAIL_PATH}
  //       element={
  //         <PrivateRouteContainer>
  //           <WattContainer>
  //             <ServiceDetails
  //               key={APPLICATION_DETAIL_SERVICE_DETAIL_PATH}
  //             />
  //           </WattContainer>
  //         </PrivateRouteContainer>
  //           }
  //     />
  //   </>
  // )
  function CustomError () {
    const error = useRouteError()
    const navigate = useNavigate()
    if (error instanceof Error) {
      return (
        <ErrorComponent
          message={error.message}
          title={error.message}
          error={error}
          onClickDismiss={() => {
            navigate(-1)
          }}
        />
      )
    }
    // Uncaught ReferenceError: path is not defined
    return (
      <ErrorComponent
        message={error.message}
        title={error.data}
        error={error.error}
        onClickDismiss={() => {
          navigate(-1)
        }}
      />
    )
  }
  // const router = createHashRouter(routesObject)
  const router = createHashRouter([
    {
      id: 'errorpage',
      path: '/errorpage',
      element: <ErrorPage />
    },
    {
      id: 'notfound',
      path: '/notfound',
      element: <NotFound />
    },
    {
      errorElement: <CustomError />,
      id: 'root',
      element: (
        <PrivateRouteContainer>
          <HomeContainer />
        </PrivateRouteContainer>
      ),
      children: [
        {
          path: '/',
          id: 'allWatts',
          element: <AllWatts />
        },

        {
          id: 'recommendationsHistory',
          path: '/recommendations-history',
          element: <RecommendationsHistory />
        },
        {
          id: 'settings',
          path: '/settings',
          element: <Settings />
        },
        {
          path: '/profile',
          element: <Profile />
        },
        {
          id: 'taxonomy',
          path: '/taxonomy',
          element: <Taxonomy />
        },
        {
          id: 'caching',
          path: '/caching',
          element: <Caching />
        },
        {
          id: 'deployments',
          path: '/deployments',
          loader: async ({ request }) => {
            const applications = await getApplicationsRaw()
            const url = new URL(request.url)
            const page = parseInt(url.searchParams.get('page') || '0')
            const LIMIT = 10
            const response = await getApiDeploymentsHistory({
              limit: LIMIT,
              offset: page * LIMIT
            })
            const { totalCount, deployments } = response
            const d = deployments.map(deployment => {
              const application = applications.find(application => application.id === deployment.applicationId)
              return { ...deployment, applicationName: application.name }
            })
            return { totalCount, deployments: d, applications }
          },
          element: <AllDeployments />
        },
        {
          loader: async () => {
            const applications = await getApplicationsRaw()
            return { applications }
          },
          id: 'activities',
          path: '/activities',
          element: <AllActivities />
        }
      ]
    },

    {
      path: '/watts/:applicationId',
      errorElement: <CustomError />,
      id: 'appRoot',
      loader: async ({ params }) => {
        const application = await getApiApplication(params.applicationId)
        return {
          application,
          publicUrl: null // TODO: use real url when we have it
        }
      },
      element: (
        <PrivateRouteContainer>
          <WattContainer />
        </PrivateRouteContainer>
      ),
      children: [
        {
          path: '',
          id: 'watt/details',
          element: <AppDetails />
        },
        {
          path: 'activities',
          id: 'watt/activities',
          loader: async (loaderObject) => {
            const { applicationId } = loaderObject.params
            const [activities, users, types] = await Promise.all([
              getApiActivities(applicationId),
              getApiActivitiesUsers(),
              getApiActivitiesTypes()
            ])
            return {
              applicationId,
              activities,
              users,
              types
            }
          },
          element: <Activities />
        },
        {
          path: 'deployment-history',
          id: 'watt/deploymentHistory',
          loader: async ({ request, params }) => {
            const url = new URL(request.url)
            const page = parseInt(url.searchParams.get('page') || '0')
            const LIMIT = 10
            const response = await getApiDeploymentsHistory({
              filterDeploymentsByApplicationId: params.applicationId,
              limit: LIMIT,
              offset: page * LIMIT
            })
            const { totalCount, deployments } = response

            return { totalCount, deployments }
          },
          element: <DeploymentHistory />
        },
        {
          id: 'watt/applications',
          path: 'applications',
          element: <Services />
        },
        {
          id: 'watt/applications/detail',
          loader: async ({ params }) => {
            return { serviceId: params.serviceId }
          },
          path: 'applications/:serviceId',
          element: <ServiceDetails />
        },
        {
          id: 'watt/scheduled-jobs',
          path: 'scheduled-jobs',
          element: <ScheduledJobs />
        },
        {
          id: 'watt/scheduled-jobs-detail',
          loader: async ({ params }) => {
            const job = await callApi('cron', `jobs/${params.id}`, 'GET')
            return { jobName: job.name }
          },
          path: 'scheduled-jobs/:id',
          element: <ScheduledJobDetail />
        },
        {
          id: 'watt/autoscaler',
          loader: async ({ params }) => {
            const query = `where.applicationId.eq=${params.applicationId}`
            const signals = await callApi('scaler', `scaleEvents?${query}`, 'GET')
            const scaleConfigs = await callApi('scaler', `applicationScaleConfigs?${query}`, 'GET')

            // get metrics
            const memory = await callApi('metrics', `apps/${params.applicationId}/mem`, 'GET')
            const rps = await callApi('metrics', `kubernetes/apps/${params.applicationId}/rps`, 'GET')

            // get kubernetes resources
            const kubernetesResources = await getKubernetesResources(params.applicationId)
            return {
              signals,
              scaleConfigs,
              applicationId: params.applicationId,
              memory,
              k8s: kubernetesResources,
              rps
            }
          },
          path: 'autoscaler',
          element: <Autoscaler />
        },
        {
          id: 'watt/settings',
          loader: async ({ params }) => {
            const scaleConfig = await callApi('scaler', `applications/${params.applicationId}/scale-configs`, 'GET')
            return { scaleConfig }
          },
          path: 'settings',
          element: <ApplicationSettings />
        },
        {
          id: 'watt/flamegraphs',
          loader: async ({ params }) => {
            const query = new URLSearchParams({
              'where.applicationId.eq': params.applicationId
            })
            const flamegraphs = await callApi('scaler', `flamegraphs?${query.toString()}`, 'GET')

            query.set('where.status.eq', 'running')
            const pods = await callApi('control-plane', `/instances?${query.toString()}`, 'GET')
            return { flamegraphs, pods }
          },
          path: 'flamegraphs',
          element: <Flamegraphs />
        },
        {
          id: 'watt/flamegraphs-detail',
          loader: async ({ params }) => {
            try {
              const flamegraph = await callApi('scaler', `flamegraphs/${params.id}`, 'GET')
              const profileUrl = `${import.meta.env.VITE_API_BASE_URL}/scaler/flamegraphs/${flamegraph.id}/download`
              const profile = await fetchProfile(profileUrl)
              return { flamegraph, profile }
            } catch (error) {
              console.error(error)
              return {
                flamegraph: {
                  id: params.id,
                  data: null
                }
              }
            }
          },
          path: 'flamegraphs/:id',
          element: <FlamegraphDetail />
        }
      ]
    },
    {
      path: '/watts/:applicationId/autoscaler/:podId',
      id: 'autoscalerPodDetailRoot',
      loader: async ({ params }) => {
        const application = await getApiApplication(params.applicationId)
        return { application }
      },
      errorElement: <CustomError />,
      element: (
        <PrivateRouteContainer>
          <AutoscalerPodDetailContainer />
        </PrivateRouteContainer>
      ),
      children: [
        {
          path: '',
          loader: async ({ params }) => {
            const podMetrics = await getApiPod(params.applicationId, params.podId)
            return {
              pod: {
                id: params.podId,
                dataValues: podMetrics
              }
            }
          },
          id: 'autoscalerPodDetail/overview',
          element: <PodOverview />
        },
        {
          path: 'signals-history',
          id: 'autoscalerPodDetail/signalsHistory',
          loader: async ({ params }) => {
            return getPodSignals(params.applicationId, params.podId)
          },
          element: <PodSignalsHistory />
        },
        {
          path: 'applications',
          loader: async ({ params }) => {
            const podMetrics = await getApiPod(params.applicationId, params.podId)
            return {
              pod: {
                id: params.podId,
                dataValues: podMetrics
              }
            }
          },
          id: 'autoscalerPodDetail/applications',
          element: <PodServicesCharts />
        }
      ]
    }

  ])
  return router
}
