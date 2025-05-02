import React from 'react'
import { createHashRouter, useNavigate, useRouteError } from 'react-router-dom'
import ErrorComponent from './components/errors/ErrorComponent'
import PrivateRouteContainer from './layout/PrivateRouteContainer'
import HomeContainer from './layout/HomeContainer'
import AllApplications from './components/applications/all/AllApplications'
import RecommendationsHistory from './components/recommendations/RecommendationHistory'
import Settings from './components/settings/Settings'
import Profile from './components/profile/Profile'
import { getApiActivities, getApiActivitiesUsers, getApiDeploymentsHistory, getApiApplication, getApiActivitiesTypes } from './api'
import Activities from '~/components/application/activities/Activities'
import DeploymentHistory from '~/components/application/deployment_history/DeploymentHistory'
import AppDetailsV2 from '~/components/application/detail/AppDetailsV2'
import ApplicationContainer from '~/layout/ApplicationContainer'

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
import Logs from './components/application/application-detail-logs/Logs'
import Autoscaler from './components/application/autoscaler/Autoscaler'
import ApplicationSettings from './components/application/settings/Settings'
import NotFound from './pages/NotFound'
import ServiceDetails from './components/application/services/ServiceDetails'

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
  //     <Route
  //       path={AUTOSCALER_POD_DETAIL_OVERVIEW_PATH}
  //       element={
  //         <PrivateRouteContainer>
  //           <AutoscalerPodDetailContainer>
  //             <PodOverview
  //               ref={autoscalerPodDetailOverviewRef}
  //               key={AUTOSCALER_POD_DETAIL_OVERVIEW_PATH}
  //             />
  //           </AutoscalerPodDetailContainer>
  //         </PrivateRouteContainer>
  //           }
  //     />
  //     <Route
  //       path={AUTOSCALER_POD_DETAIL_SERVICES_PATH}
  //       element={
  //         <PrivateRouteContainer>
  //           <AutoscalerPodDetailContainer>
  //             <PodServicesCharts
  //               ref={autoscalerPodDetailServicesRef}
  //               key={AUTOSCALER_POD_DETAIL_SERVICES_PATH}
  //             />
  //           </AutoscalerPodDetailContainer>
  //         </PrivateRouteContainer>
  //           }
  //     />
  //     <Route
  //       path={AUTOSCALER_POD_DETAIL_LOGS_PATH}
  //       element={
  //         <PrivateRouteContainer>
  //           <AutoscalerPodDetailContainer>
  //             <PodDetailLogs
  //               ref={autoscalerPodDetailLogsRef}
  //               key={AUTOSCALER_POD_DETAIL_LOGS_PATH}
  //             />
  //           </AutoscalerPodDetailContainer>
  //         </PrivateRouteContainer>
  //           }
  //     />

  //     {/* Preview Pod Detail Container Routes */}
  //     <Route
  //       path={PREVIEW_POD_DETAIL_OVERVIEW_PATH}
  //       element={
  //         <PrivateRouteContainer>
  //           <PreviewPodDetailContainer>
  //             <PodOverview
  //               ref={previewPodDetailOverviewRef}
  //               key={PREVIEW_POD_DETAIL_OVERVIEW_PATH}
  //             />
  //           </PreviewPodDetailContainer>
  //         </PrivateRouteContainer>
  //           }
  //     />
  //     <Route
  //       path={PREVIEW_POD_DETAIL_SERVICES_PATH}
  //       element={
  //         <PrivateRouteContainer>
  //           <PreviewPodDetailContainer>
  //             <PodServicesCharts
  //               ref={previewPodDetailServicesRef}
  //               key={PREVIEW_POD_DETAIL_SERVICES_PATH}
  //             />
  //           </PreviewPodDetailContainer>
  //         </PrivateRouteContainer>
  //           }
  //     />
  //     <Route
  //       path={PREVIEW_POD_DETAIL_LOGS_PATH}
  //       element={
  //         <PrivateRouteContainer>
  //           <PreviewPodDetailContainer>
  //             <PodDetailLogs
  //               ref={previewPodDetailLogsRef}
  //               key={PREVIEW_POD_DETAIL_LOGS_PATH}
  //             />
  //           </PreviewPodDetailContainer>
  //         </PrivateRouteContainer>
  //           }
  //     />

  //     {/* Error and Not Found Routes */}
  //     <Route
  //       path={APPLICATION_DETAIL_SERVICE_DETAIL_PATH}
  //       element={
  //         <PrivateRouteContainer>
  //           <ApplicationContainer>
  //             <ServiceDetails
  //               key={APPLICATION_DETAIL_SERVICE_DETAIL_PATH}
  //             />
  //           </ApplicationContainer>
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
          id: 'allApplications',
          element: <AllApplications />
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
          element: <AllDeployments />
        },
        {
          id: 'activities',
          path: '/activities',
          element: <AllActivities />
        }
      ]
    },

    {
      path: '/applications/:applicationId',
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
          <ApplicationContainer />
        </PrivateRouteContainer>
      ),
      children: [
        {
          path: '',
          id: 'application/details',
          element: <AppDetailsV2 />
        },
        {
          path: 'activities',
          id: 'application/activities',
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
          id: 'application/deploymentHistory',
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
          id: 'application/services',
          path: 'services',
          element: <Services />
        },
        {
          id: 'application/services/detail',
          loader: async ({ params }) => {
            return { serviceId: params.serviceId }
          },
          path: 'services/:serviceId',
          element: <ServiceDetails />
        },
        {
          id: 'application/scheduled-jobs',
          path: 'scheduled-jobs',
          element: <ScheduledJobs />
        },
        {
          id: 'application/scheduled-jobs-detail',
          path: 'scheduled-jobs/:id',
          element: <ScheduledJobDetail />
        },
        {
          id: 'application/logs',
          path: 'logs',
          element: <Logs />
        },
        {
          id: 'application/autoscaler',
          path: 'autoscaler',
          element: <Autoscaler />
        },
        {
          id: 'application/settings',
          path: 'settings',
          element: <ApplicationSettings />
        }
      ]
    }

  ])
  return router
}
