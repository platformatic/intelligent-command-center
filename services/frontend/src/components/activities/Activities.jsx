import React, { useEffect, useState } from 'react'
import styles from './Activities.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import TableActivities from '~/components/application/activities/TableActivities'
import { getApiActivities, getApiActivitiesTypes } from '~/api'
import ErrorComponent from '~/components/errors/ErrorComponent'
import { FILTER_ALL } from '~/ui-constants'
import { MEDIUM, RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import Forms from '@platformatic/ui-components/src/components/forms'
import { useLoaderData } from 'react-router-dom'
import Paginator from '../ui/Paginator'

const LIMIT = 15

const Activities = React.forwardRef(({ _ }, ref) => {
  const ALL_APPLICATIONS = { label: 'All watts', value: FILTER_ALL }
  const ALL_EVENTS = { label: 'All events', value: FILTER_ALL }

  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [activitiesLoaded, setActivitiesLoaded] = useState(false)
  const [reloadActivities, setReloadActivities] = useState(true)
  const [activitiesPage, setActivitiesPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [activities, setActivities] = useState([])
  const [optionsApplications, setOptionApplications] = useState([])
  const [filterByApplication, setFilterByApplication] = useState(ALL_APPLICATIONS)
  const [filterByEvent, setFilterByEvent] = useState(ALL_EVENTS)
  const [optionsEvents, setOptionsEvents] = useState([])
  const [enableFilters, setEnableFilter] = useState(false)
  const { applications } = useLoaderData()

  useEffect(() => {
    setOptionApplications([ALL_APPLICATIONS].concat(applications.map(app => ({
      label: app.name,
      value: app.id
    }))))
  }, [applications])

  useEffect(() => {
    if (activitiesPage >= 0 || reloadActivities) {
      setActivitiesLoaded(false)
      loadActivities()
    }
  }, [activitiesPage, reloadActivities])

  useEffect(() => {
    if (filterByEvent.value || filterByApplication.value) {
      setReloadActivities(true)
      setActivitiesLoaded(false)
    }
  }, [filterByEvent, filterByApplication])

  async function loadActivities () {
    try {
      const applicationId = filterByApplication.value === FILTER_ALL ? '' : filterByApplication.value
      const response = await getApiActivities(applicationId, {
        limit: LIMIT,
        offset: activitiesPage * LIMIT,
        event: filterByEvent.value === FILTER_ALL ? '' : filterByEvent.value
      })
      const { activities: data, totalCount: count } = response
      setTotalCount(count)
      if (!enableFilters) {
        setEnableFilter(data.length > 0)
      }

      const enriched = data.map(activity => ({
        ...activity,
        applicationName: applications.find(app => app.id === activity.applicationId)?.name
      }))
      setActivities(enriched)
      setActivitiesLoaded(true)
      setReloadActivities(false)

      const typesResponse = await getApiActivitiesTypes()
      const types = await typesResponse.json()
      setOptionsEvents([ALL_EVENTS].concat(Object.keys(types).map(k => ({
        label: types[k],
        value: k
      }))))
    } catch (err) {
      console.error(`Error on loadActivities ${err}`)
      setError(err)
      setShowErrorComponent(true)
    }
  }

  function handleSelectEvent (event) {
    setFilterByEvent({
      label: event.detail.label,
      value: event.detail.value
    })
  }

  function handleSelectApplication (event) {
    setFilterByApplication({
      label: event.detail.label,
      value: event.detail.value
    })
  }

  if (showErrorComponent) {
    return <ErrorComponent error={error} onClickDismiss={() => setShowErrorComponent(false)} />
  }

  return (
    <div className={styles.containerActivities} ref={ref}>
      <div className={styles.contentActivities}>
        <div className={`${commonStyles.largeFlexBlock} ${commonStyles.fullWidth} ${commonStyles.flexGrow}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
              <Icons.CheckListIcon color={WHITE} size={MEDIUM} />
              <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Activities</p>
            </div>
            <div className={styles.filtersContainer}>
              <Forms.Select
                defaultContainerClassName={styles.selectApplicationName}
                backgroundColor={RICH_BLACK}
                borderColor={WHITE}
                defaultOptionsClassName={`${typographyStyles.desktopButtonSmall} ${styles.maxHeightOptions}`}
                options={optionsApplications}
                onSelect={handleSelectApplication}
                optionsBorderedBottom={false}
                mainColor={WHITE}
                borderListColor={WHITE}
                value={filterByApplication.label}
                inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite} ${styles.heightSelectClass}`}
                paddingClass={styles.selectPaddingClass}
                disabled={!enableFilters}
                handleClickOutside
              />
              <Forms.Select
                defaultContainerClassName={styles.selectEvents}
                backgroundColor={RICH_BLACK}
                borderColor={WHITE}
                defaultOptionsClassName={`${typographyStyles.desktopButtonSmall} ${styles.maxHeightOptions}`}
                options={optionsEvents}
                onSelect={handleSelectEvent}
                optionsBorderedBottom={false}
                mainColor={WHITE}
                borderListColor={WHITE}
                value={filterByEvent.label}
                inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite} ${styles.heightSelectClass}`}
                paddingClass={styles.selectPaddingClass}
                disabled={!enableFilters}
                handleClickOutside
              />
            </div>
          </div>
          <TableActivities
            activitiesLoaded={activitiesLoaded}
            activities={activities}
            showWattName
            onErrorOccurred={() => setShowErrorComponent(true)}
          />
        </div>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
          <Paginator
            pagesNumber={Math.ceil(totalCount / LIMIT)}
            onClickPage={(page) => setActivitiesPage(page)}
            selectedPage={activitiesPage}
          />
        </div>
      </div>
    </div>
  )
})

export default Activities
