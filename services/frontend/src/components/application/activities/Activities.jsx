import React, { useEffect, useState } from 'react'
import styles from './Activities.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import TableActivities from './TableActivities'
import { getApiActivities, getApiActivitiesTypes } from '~/api'
import ErrorComponent from '~/components/errors/ErrorComponent'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import { FILTER_ALL } from '~/ui-constants'
import { WHITE, MEDIUM, RICH_BLACK, BLACK_RUSSIAN, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Button, LoadingSpinnerV2 } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'
import Forms from '@platformatic/ui-components/src/components/forms'
import { useNavigate, useRouteLoaderData } from 'react-router-dom'
import { APPLICATION_DETAILS_ALL_ACTIVITIES } from '~/paths'
import Paginator from '../../ui/Paginator'

const DEFAULT_PAGE_SIZE = 15
const COMPACT_LIMIT = 5

function Activities ({
  applicationId: applicationIdProp,
  compact = false,
  pageSize = DEFAULT_PAGE_SIZE,
  gridClassName = ''
}) {
  const ALL_EVENTS = { label: 'All events', value: FILTER_ALL }
  const navigate = useNavigate()
  const routeData = useRouteLoaderData('appRoot')
  const applicationId = applicationIdProp || routeData?.application?.id

  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [activitiesLoaded, setActivitiesLoaded] = useState(false)
  const [activities, setActivities] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [activitiesPage, setActivitiesPage] = useState(0)
  const [reloadActivities, setReloadActivities] = useState(true)

  const [optionsEvents, setOptionsEvents] = useState([])
  const [filterByEvent, setFilterByEvent] = useState(ALL_EVENTS)
  const [enableFilters, setEnableFilter] = useState(false)

  const limit = compact ? COMPACT_LIMIT : pageSize

  useEffect(() => {
    if (activitiesPage >= 0 || reloadActivities) {
      setActivitiesLoaded(false)
      loadActivities()
    }
  }, [activitiesPage, reloadActivities])

  useEffect(() => {
    if (!compact && filterByEvent.value) {
      setReloadActivities(true)
      setActivitiesLoaded(false)
    }
  }, [filterByEvent])

  async function loadActivities () {
    try {
      const filters = compact
        ? { limit, offset: 0 }
        : {
            limit,
            offset: activitiesPage * limit,
            event: filterByEvent.value === FILTER_ALL ? '' : filterByEvent.value
          }

      const response = await getApiActivities(applicationId, filters)
      const { activities: data, totalCount: count } = response
      setTotalCount(count)
      setActivities(data)
      setActivitiesLoaded(true)
      setReloadActivities(false)

      if (!compact) {
        if (!enableFilters) {
          setEnableFilter(data.length > 0)
        }
        const typesResponse = await getApiActivitiesTypes()
        const types = await typesResponse.json()
        setOptionsEvents([ALL_EVENTS].concat(Object.keys(types).map(k => ({
          label: types[k],
          value: k
        }))))
      }
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

  function viewAllActivities () {
    navigate(APPLICATION_DETAILS_ALL_ACTIVITIES.replace(':applicationId', applicationId))
  }

  if (showErrorComponent) {
    return <ErrorComponent error={error} onClickDismiss={() => setShowErrorComponent(false)} />
  }

  if (compact) {
    return (
      <BorderedBox classes={`${gridClassName} ${styles.borderedBoxContainer} ${commonStyles.fullWidth}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
        <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
              <Icons.CheckListIcon color={WHITE} size={MEDIUM} />
              <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Activities</p>
            </div>
            <div className={styles.buttonContainer}>
              <Button
                type='button'
                label='View All Activities'
                onClick={() => viewAllActivities()}
                color={WHITE}
                backgroundColor={RICH_BLACK}
                paddingClass={commonStyles.smallButtonPadding}
                textClass={typographyStyles.desktopButtonSmall}
                disabled={activities.length === 0}
              />
            </div>
          </div>
          {renderCompactContent()}
        </div>
      </BorderedBox>
    )
  }

  return (
    <div className={styles.containerActivities}>
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
          onErrorOccurred={() => setShowErrorComponent(true)}
        />
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
          <Paginator
            pagesNumber={Math.ceil(totalCount / limit)}
            onClickPage={(page) => setActivitiesPage(page)}
            selectedPage={activitiesPage}
          />
        </div>
      </div>
    </div>
  )

  function renderCompactContent () {
    if (!activitiesLoaded) {
      return (
        <LoadingSpinnerV2
          loading
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: []
          }}
          containerClassName={loadingSpinnerStyles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (activities.length === 0) {
      return <NoDataAvailable iconName='NoActivitiesIcon' title='There are not activities yet' />
    }

    return (
      <TableActivities
        activitiesLoaded={activitiesLoaded}
        activities={activities}
        onErrorOccurred={() => setShowErrorComponent(true)}
      />
    )
  }
}

export default Activities
