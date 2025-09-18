import React, { useEffect, useState } from 'react'
import styles from './Activities.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import TableActivities from './TableActivities'
import { getApiActivities, getApiActivitiesTypes, getApiActivitiesUsers } from '~/api'
import ErrorComponent from '~/components/errors/ErrorComponent'
import { FILTER_ALL } from '~/ui-constants'
import { MEDIUM, RICH_BLACK, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import { Button } from '@platformatic/ui-components'
import Forms from '@platformatic/ui-components/src/components/forms'
import { useLoaderData } from 'react-router-dom'

const Activities = React.forwardRef(({ _ }, ref) => {
  const ALL_APPLICATIONS = { label: 'All watts', value: FILTER_ALL }
  const ALL_USERS = { label: 'All Users', value: FILTER_ALL }
  const ALL_EVENTS = { label: 'All events', value: FILTER_ALL }
  const LIMIT = 13

  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [activitiesLoaded, setActivitiesLoaded] = useState(false)
  const [reloadActivities, setReloadActivities] = useState(true)
  const [pages, setPages] = useState([])
  const [activitiesPage, setActivitiesPage] = useState(0)
  const [filteredActivities, setFilteredActivities] = useState([])
  const [optionsApplications, setOptionApplications] = useState([])
  const [filterActivitiesByApplicationId, setFilterActivitiesByApplicationId] = useState(ALL_APPLICATIONS)
  const [filterActivitiesByUserId, setFilterActivitiesByUserId] = useState(ALL_USERS)
  const [filterActivitiesByEventId, setFilterActivitiesByEventId] = useState(ALL_EVENTS)
  const [optionsUsers, setOptionsUsers] = useState([])
  const [optionsEvents, setOptionsEvents] = useState([])
  const [enableFilters, setEnableFilter] = useState(false)
  const { applications } = useLoaderData()

  useEffect(() => {
    const apps = {
      label: 'All watts',
      value: FILTER_ALL
    }
    setOptionApplications([apps].concat(applications.map(app => ({
      label: app.name,
      value: app.id
    }))))
  }, [applications])

  useEffect(() => {
    if ((activitiesPage >= 0 || reloadActivities)) {
      setActivitiesLoaded(false)
      async function loadActivities () {
        try {
          let response = await getApiActivities(
            filterActivitiesByApplicationId.value === FILTER_ALL ? '' : filterActivitiesByApplicationId.value,
            {
              limit: LIMIT,
              offset: activitiesPage * LIMIT,
              event: filterActivitiesByEventId.value === FILTER_ALL ? '' : filterActivitiesByEventId.value,
              userId: filterActivitiesByUserId.value === FILTER_ALL ? '' : filterActivitiesByUserId.value
            })
          const { activities, totalCount } = response
          if (!enableFilters) {
            setEnableFilter(activities.length > 0)
          }
          setFilteredActivities([...activities])
          setActivitiesLoaded(true)
          setReloadActivities(false)
          const arrayPages = Array.from(new Array(Math.ceil(totalCount / LIMIT)).keys())
          setPages([...arrayPages])

          response = await getApiActivitiesTypes()
          let data = await response.json()

          setOptionsEvents([ALL_EVENTS].concat(Object.keys(data).map(k => ({
            label: data[k],
            value: k
          }))))

          response = await getApiActivitiesUsers()
          data = await response.json()
          setOptionsUsers([ALL_USERS].concat(data.map(user => ({
            label: user.username,
            value: user.id
          }))))
        } catch (error) {
          console.error(`Error on getDetailActivities ${error}`)
          setError(error)
          setShowErrorComponent(true)
        }
      }
      loadActivities()
    }
  }, [activitiesPage, reloadActivities])

  useEffect(() => {
    if (filterActivitiesByUserId.value || filterActivitiesByEventId.value || filterActivitiesByApplicationId.value) {
      setReloadActivities(true)
    }
  }, [filterActivitiesByUserId, filterActivitiesByEventId, filterActivitiesByApplicationId])

  function handleSelectUser (event) {
    setFilterActivitiesByUserId({
      label: event.detail.label,
      value: event.detail.value
    })
  }

  function handleSelectEvent (event) {
    setFilterActivitiesByEventId({
      label: event.detail.label,
      value: event.detail.value
    })
  }

  function handleSelectApplication (event) {
    setFilterActivitiesByApplicationId({
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
                defaultOptionsClassName={`${typographyStyles.desktopButtonSmall} ${styles.maxHeighOptions}`}
                options={optionsApplications}
                onSelect={handleSelectApplication}
                optionsBorderedBottom={false}
                mainColor={WHITE}
                borderListColor={WHITE}
                value={filterActivitiesByApplicationId.label}
                inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite} ${styles.heightSelectClass}`}
                paddingClass={styles.selectPaddingClass}
                disabled={!enableFilters}
                handleClickOutside
              />
              <Forms.Select
                defaultContainerClassName={styles.selectUsers}
                backgroundColor={RICH_BLACK}
                borderColor={WHITE}
                defaultOptionsClassName={`${typographyStyles.desktopButtonSmall} ${styles.maxHeighOptions}`}
                options={optionsUsers}
                onSelect={handleSelectUser}
                optionsBorderedBottom={false}
                mainColor={WHITE}
                borderListColor={WHITE}
                value={filterActivitiesByUserId.label}
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
                value={filterActivitiesByEventId.label}
                inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite} ${styles.heightSelectClass}`}
                paddingClass={styles.selectPaddingClass}
                disabled={!enableFilters}
                handleClickOutside
              />
            </div>
          </div>
          <TableActivities
            activitiesLoaded={activitiesLoaded}
            applications={applications}
            activities={filteredActivities}
            onErrorOccurred={() => setShowErrorComponent(true)}
          />
        </div>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
          {pages.map(page =>
            <Button
              key={page}
              paddingClass={commonStyles.buttonPadding}
              label={`${page + 1}`}
              onClick={() => setActivitiesPage(page)}
              color={WHITE}
              selected={page === activitiesPage}
              backgroundColor={TRANSPARENT}
              bordered={false}
            />
          )}
        </div>
      </div>
    </div>
  )
})

export default Activities
