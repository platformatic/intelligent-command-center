import React, { useEffect, useState } from 'react'
import { useLoaderData, useParams, useRouteLoaderData } from 'react-router-dom'

import { BorderedBox, Icons } from '@platformatic/ui-components'
import { BLACK_RUSSIAN, MEDIUM, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import PanelCompliancyService from './PanelCompliancyService'
import { getApiCompliancy } from '../../../api'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'

import ThreadUsage from '../../metrics/ThreadUsage'
// import ArcMetrics from '../autoscaler/ArcMetrics'
import styles from './ServiceDetails.module.css'

export default function ServiceDetails () {
  const { application } = useRouteLoaderData('appRoot')
  const { threads } = useLoaderData()
  const { serviceId } = useParams()
  const [service, setService] = useState(null)
  const [compliancyReport, setCompliancyReport] = useState(null)

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
  useEffect(() => {
    if (application) {
      const theService = application.state.services.find((s) => s.id === serviceId)
      setService(theService)
      getServiceCompliancyReport()
    }
  }, [application])

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

          </div>

          <div className={styles.firstLine}>
            <div className={`${commonStyles.fullWidth} ${commonStyles.fullHeight}`}>
              <ThreadUsage
                data={threads}
                serviceId={serviceId}
                applicationId={application.id}
              />
            </div>
            {/* <div className={styles.resources}>
              <ArcMetrics {...serviceResources} title='Max Heap' />
            </div> */}
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
