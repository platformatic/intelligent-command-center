import React, { useEffect, useState } from 'react'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import styles from './AppDetails.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import AppNameBox from './AppNameBox'
import ServicesBox from './ServicesBox'
import DeploymentsBox from './DeploymentsBox'
import ErrorComponent from '~/components/errors/ErrorComponent'
import { useParams } from 'react-router-dom'
import { getApiApplicationUrl } from '~/api'
import useICCStore from '~/useICCStore'
import NodeJSMetrics from './NodeJSMetrics'
import KubernetesResources from './KubernetesResources'
import AppDetailActivities from './AppDetailActivities'
import { PAGE_APPLICATION_DETAILS } from '../../../ui-constants'

const AppDetails = React.forwardRef(({ _ }, ref) => {
  const globalState = useICCStore()
  const { applicationSelected, setCurrentPage, setNavigation } = globalState
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(false)
  const { appId } = useParams()
  const [innerLoading, setInnerLoading] = useState(true)
  const [applicationPublicUrl, setApplicationPublicUrl] = useState('')

  useEffect(() => {
    setCurrentPage(PAGE_APPLICATION_DETAILS)

    setNavigation({
      label: applicationSelected?.name,
      page: PAGE_APPLICATION_DETAILS
    })
  }, [])

  useEffect(() => {
    if (appId) {
      async function loadApplication () {
        try {
          setInnerLoading(true)
          const applicationPublicUrl = await getApiApplicationUrl(appId)
          setApplicationPublicUrl(applicationPublicUrl?.url || '-')
        } catch (error) {
          console.error(`Error on getApiApplication ${error}`)
          setError(error)
          setShowErrorComponent(true)
        } finally {
          setInnerLoading(false)
        }
      }
      loadApplication()
    }
  }, [appId])

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
            style: `${typographyStyles.desktopBody} ${typographyStyles.textWhite}`,
            text: 'Loading your application Url...'
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

  return applicationSelected && (
    <div className={styles.container} ref={ref}>
      <div className={styles.containerElement}>
        <div className={styles.content}>
          <AppNameBox
            gridClassName={styles.appNameBox}
            onErrorOccurred={(error) => {
              setError(error)
              setShowErrorComponent(true)
            }}
            applicationPublicUrl={applicationPublicUrl}
          />
          <ServicesBox
            gridClassName={styles.servicesBox}
          />
          <DeploymentsBox
            gridClassName={styles.deploymentsBox}
          />
          <NodeJSMetrics
            gridClassName={styles.nodeJsMetricsBox}
          />
          <KubernetesResources
            gridClassName={styles.nodeJsMetricsBox}
          />
          <AppDetailActivities
            gridClassName={styles.activitiesBox}
          />
        </div>
      </div>
    </div>
  )
})

export default AppDetails
