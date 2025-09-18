import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './ListView.module.css'
import { Button, LoadingSpinnerV2, SearchBarV2 } from '@platformatic/ui-components'
import ServiceElement from './ServiceElement'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import { FILTER_ALL, SERVICE_OUTDATED } from '~/ui-constants'
import { MEDIUM, RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import { generatePath, useNavigate, useRouteLoaderData } from 'react-router-dom'
import { getApiCompliancy } from '~/api'
import Icons from '@platformatic/ui-components/src/components/icons'
import { APPLICATION_DETAILS_ALL_SERVICES_DETAIL } from '../../../paths'

function getFilteredOutdatedServices (allServices, comparingServices) {
  return allServices.filter(service => {
    if (comparingServices[service.id]) {
      const foundOutdated = Object.keys(comparingServices[service.id]).find(dependency => {
        const { current, wanted } = comparingServices[service.id][dependency]
        return current !== wanted
      })
      return foundOutdated !== undefined
    } else {
      return false
    }
  })
}

function getStatusService (allServices, comparingServices, service) {
  const val = getFilteredOutdatedServices(allServices, comparingServices).find(s => s.id === service.id)
  return val
}

function ListView () {
  const navigate = useNavigate()
  const { application } = useRouteLoaderData('appRoot')
  const applicationSelectedServices = application.state.services
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [filteredServices, setFilteredServices] = useState([])
  const [filterServiceByName, setFilterServiceByName] = useState('')
  const [filterServiceByStatus, setFilterServiceByStatus] = useState({ label: 'All Applications', value: FILTER_ALL })
  const [filtersServiceByStatus, setFiltersServiceByStatus] = useState([])
  const [reportServices, setReportServices] = useState({})

  useEffect(() => {
    if (applicationSelectedServices.length > 0) {
      async function loadCompliancy () {
        setShowNoResult(false)
        setInnerLoading(true)

        const report = await getApiCompliancy(application.id)
        let services = {}
        if (report.length > 0) {
          const ruleSet = report[0].ruleSet
          const index = Object.keys(report[0].ruleSet).find(rule => report[0].ruleSet[rule].name === 'outdated-npm-deps')
          services = ruleSet[index]?.details?.services ?? {}
        }

        setFilteredServices([...applicationSelectedServices])
        setReportServices(services)

        const outdatedServices = getFilteredOutdatedServices(applicationSelectedServices, services).length

        setFiltersServiceByStatus([{
          label: `All Applications (${applicationSelectedServices.length})`,
          value: FILTER_ALL,
          iconName: 'PlatformaticServiceIcon',
          disabled: false
        }, {
          label: `Outdated (${outdatedServices})`,
          value: SERVICE_OUTDATED,
          iconName: 'OutdatedServiceIcon',
          disabled: outdatedServices === 0
        }])
        setInnerLoading(false)
      }
      loadCompliancy()
    } else {
      setShowNoResult(true)
      setInnerLoading(false)
    }
  }, [applicationSelectedServices.length])

  useEffect(() => {
    if (filterServiceByStatus.value || filterServiceByName) {
      let founds = [...applicationSelectedServices]
      if (filterServiceByStatus.value && filterServiceByStatus.value !== FILTER_ALL) {
        if (filterServiceByStatus.value === SERVICE_OUTDATED) {
          founds = getFilteredOutdatedServices(founds, reportServices)
        }
      }
      if (filterServiceByName && filterServiceByName !== '') {
        founds = founds.filter(service => service.id.toLowerCase().includes(filterServiceByName.toLowerCase()))
      }
      setFilteredServices(founds)
    } else {
      setFilteredServices([...applicationSelectedServices])
    }
  }, [
    filterServiceByStatus.value,
    filterServiceByName
  ])

  function getDependencies (service) {
    return reportServices[service.id] || {}
  }

  function handleSelectedService (service) {
    navigate(generatePath(APPLICATION_DETAILS_ALL_SERVICES_DETAIL, { applicationId: application.id, serviceId: service.id }))
  }

  function handleSelectService (event) {
    setFilterServiceByStatus({
      label: event.detail.label,
      value: event.detail.value
    })
  }

  function onClearFilterServiceName () {
    setFilterServiceByName('')
  }

  function onChangeFilterServiceName (value) {
    setFilterServiceByName(value)
  }

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading={innerLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading your applications...'
            }, {
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
              text: 'This process will just take a few seconds.'
            }]
          }}
          containerClassName={loadingSpinnerStyles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (showNoResult) { return <NoDataAvailable iconName='PlatformaticServiceIcon' /> }

    return (
      <>
        <div className={`${styles.content}`}>
          <div className={styles.filtersContainer}>
            <SearchBarV2
              placeholder='Search for an Application Name'
              onClear={onClearFilterServiceName}
              onChange={onChangeFilterServiceName}
              inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
              paddingClass={styles.searchBarPaddingClass}
            />
            {filtersServiceByStatus.map(filter => (
              <Button
                key={filter.value}
                label={filter.label}
                onClick={() => handleSelectService({ detail: { label: filter.label, value: filter.value } })}
                color={WHITE}
                backgroundColor={RICH_BLACK}
                paddingClass={commonStyles.smallButtonPadding}
                textClass={typographyStyles.desktopButtonSmall}
                selected={filterServiceByStatus.value === filter.value}
                platformaticIcon={{ iconName: filter.iconName, color: WHITE }}
                disabled={filter.disabled}
              />
            ))}
          </div>

          {filteredServices.length === 0 && (
            <div className={`${commonStyles.smallFlexBlock} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${commonStyles.justifyCenter} ${styles.noDataFoundContainer}`}>
              <Icons.NoResultsIcon color={WHITE} size={MEDIUM} />
              <div className={`${commonStyles.miniFlexBlock} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
                <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite}`}>No results found</p>
                <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>There are no results for your search.</p>
              </div>
            </div>
          )}

          {filteredServices.length > 0 && (
            <div className={styles.serviceContainer}>
              {filteredServices.map((service, index) => (
                <ServiceElement
                  key={index}
                  id={service.id}
                  service={service}
                  applicationEntrypoint={service.entrypoint}
                  onClickService={() => handleSelectedService(service)}
                  status={getStatusService(applicationSelectedServices, reportServices, service) ? SERVICE_OUTDATED : ''}
                  dependencies={getDependencies(service)}
                />
              ))}
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div className={`${styles.container}`}>
      {renderComponent()}
    </div>
  )
}

export default ListView
