import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './GridApplications.module.css'
import { LoadingSpinnerV2, SearchBarV2 } from '@platformatic/ui-components'
import ApplicationCard from './ApplicationCard'
import NoDataFound from '~/components/ui/NoDataFound'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import { getApplicationsWithMetadata } from '../../../api'
import useSubscribeToUpdates from '~/hooks/useSubscribeToUpdates'

function GridApplications () {
  const [allApplications, setAllApplications] = useState([])
  const [innerLoading, setInnerLoading] = useState(true)
  const [filteredApplications, setFilteredApplications] = useState([])
  const [search, setSearch] = useState('')

  const { readyState, lastMessage } = useSubscribeToUpdates('applications')

  useEffect(() => {
    if (lastMessage !== null) {
      const message = JSON.parse(lastMessage.data)
      if (message.type === 'application-created') {
        loadApplications()
      }
    }
  }, [lastMessage, readyState])

  async function loadApplications () {
    const applications = await getApplicationsWithMetadata()
    setAllApplications([...applications])
    setInnerLoading(false)
    // const lastGeneration = await getLastStartedGeneration()
    // setEnableSidebarFirstLevel(lastGeneration?.mainIteration !== 0)
  }
  useEffect(() => {
    loadApplications()
  }, [])

  // apply filters to the loaded applications
  useEffect(() => {
    if (allApplications.length > 0) {
      setInnerLoading(false)
    }
    if (search && search !== '') {
      setFilteredApplications(allApplications.filter(application => application.name.toLowerCase().includes(search.toLowerCase())))
    } else {
      setFilteredApplications([...allApplications])
    }
  }, [allApplications, search])

  function onClearFilterApplicationName () {
    setSearch('')
  }

  function onChangeFilterApplicationName (value) {
    setSearch(value)
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
          containerClassName={styles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (allApplications.length === 0) {
      return (
        <NoDataFound title='No applications found' subTitle={<span>There are no existing application yet.</span>} />
      )
    }
    return (
      <div className={styles.content}>
        <div className={styles.filtersContainer}>
          <SearchBarV2
            placeholder='Search by Application name'
            onClear={onClearFilterApplicationName}
            onChange={onChangeFilterApplicationName}
            inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
            paddingClass={styles.searchBarPaddingClass}
          />
        </div>
        {filteredApplications.length === 0 && (
          <div className={`${commonStyles.smallFlexBlock} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${commonStyles.justifyCenter} ${styles.noDataFoundContainer}`}>
            <Icons.NoResultsIcon color={WHITE} size={MEDIUM} />
            <div className={`${commonStyles.miniFlexBlock} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
              <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite}`}>No results found</p>
              <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>There are no results for your search.</p>
            </div>
          </div>
        )}
        {filteredApplications.length > 0 && (
          <div className={styles.gridContainer}>
            {filteredApplications.map(application => (
              <ApplicationCard
                key={`${application.id}`}
                {...application}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`${styles.container}`}>
      {renderComponent()}
    </div>
  )
}

export default GridApplications
