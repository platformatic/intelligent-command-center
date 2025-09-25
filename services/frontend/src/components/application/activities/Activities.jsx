import React, { useEffect, useState } from 'react'
import styles from './Activities.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import TableActivities from './TableActivities'
import { getApiActivities, getApiActivitiesTypes } from '~/api'
import ErrorComponent from '~/components/errors/ErrorComponent'
import { FILTER_ALL } from '~/ui-constants'
import { WHITE, MEDIUM, RICH_BLACK } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import Forms from '@platformatic/ui-components/src/components/forms'
import { useLoaderData } from 'react-router-dom'
import Paginator from '../../ui/Paginator'

const Activities = React.forwardRef(({ _ }, ref) => {
  const LIMIT = 12
  const ALL_EVENTS = { label: 'All events', value: FILTER_ALL }

  const { applicationId } = useLoaderData()
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [activitiesLoaded, setActivitiesLoaded] = useState(false)
  const [reloadActivities, setReloadActivities] = useState(true)
  const [activitiesPage, setActivitiesPage] = useState(0)
  const [filteredActivities, setFilteredActivities] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [optionsEvents, setOptionsEvents] = useState([])
  const [filterActivitiesByEventId, setFilterActivitiesByEventId] = useState(ALL_EVENTS)
  const [enableFilters, setEnableFilter] = useState(false)
  useEffect(() => {
    if (activitiesPage >= 0 || reloadActivities) {
      async function loadApplications () {
        try {
          let response = await getApiActivities(
            applicationId,
            {
              limit: LIMIT,
              offset: activitiesPage * LIMIT,
              search: filterActivitiesByEventId.value === FILTER_ALL ? '' : filterActivitiesByEventId.value
            })
          const { activities, totalCount } = response
          setTotalCount(totalCount)
          setFilteredActivities([...activities])
          setActivitiesLoaded(true)
          setReloadActivities(false)
          if (!enableFilters) {
            setEnableFilter(activities.length > 0)
          }
          response = await getApiActivitiesTypes()
          const data = await response.json()

          setOptionsEvents([ALL_EVENTS].concat(Object.keys(data).map(k => ({
            label: data[k],
            value: k
          }))))
        } catch (error) {
          console.error(`Error on getDetailActivities ${error}`)
          setError(error)
          setShowErrorComponent(true)
        }
      }
      loadApplications()
    }
  }, [activitiesPage, reloadActivities])

  useEffect(() => {
    if (filterActivitiesByEventId.value) {
      setReloadActivities(true)
      setActivitiesLoaded(false)
    }
  }, [filterActivitiesByEventId])

  function handleSelectEvent (event) {
    setFilterActivitiesByEventId({
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
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.CheckListIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Activities</p>
          </div>
          <div className={styles.filtersContainer}>
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
          activities={filteredActivities}
          onErrorOccurred={() => setShowErrorComponent(true)}
        />
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
