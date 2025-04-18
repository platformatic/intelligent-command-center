import React, { useEffect, useState } from 'react'
import styles from './AllDeployments.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { getApiDeployments, getApplicationsRaw } from '~/api'
import ErrorComponent from '~/components/errors/ErrorComponent'
import useICCStore from '~/useICCStore'
import { PAGE_DEPLOYMENTS } from '~/ui-constants'
import { RICH_BLACK, MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import Forms from '@platformatic/ui-components/src/components/forms'
import Paginator from '~/components/ui/Paginator'
import TableAllDeployments from './TableAllDeployments'

const AllDeployments = React.forwardRef(({ _ }, ref) => {
  const LIMIT = 10
  const globalState = useICCStore()
  const {
    setNavigation,
    setCurrentPage
  } = globalState
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [deploymentsLoaded, setDeploymentsLoaded] = useState(false)
  const [applicationsLoaded, setApplicationsLoaded] = useState(false)
  const [reloadDeployments, setReloadDeployments] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [deploymentsPage, setDeploymentsPage] = useState(0)
  const [filteredDeployments, setFilteredDeployments] = useState([])
  const [optionsApplications, setOptionApplications] = useState([])
  const [enableFilterByApplicationId, setEnableFilterByApplicationId] = useState(false)
  const [filterDeploymentsByApplicationId, setFilterDeploymentsByApplicationId] = useState({ label: 'All applications', value: '' })

  useEffect(() => {
    setNavigation({
      label: 'Deployments',
      handleClick: () => {
        setCurrentPage(PAGE_DEPLOYMENTS)
      },
      key: PAGE_DEPLOYMENTS,
      page: PAGE_DEPLOYMENTS
    }, 0)
  }, [])

  useEffect(() => {
    if (applicationsLoaded && (deploymentsPage >= 0 || reloadDeployments)) {
      setDeploymentsLoaded(false)
      setFilteredDeployments([])
      async function loadApplications () {
        try {
          const response = await getApiDeployments({
            filterDeploymentsByApplicationId: filterDeploymentsByApplicationId?.value || '',
            limit: LIMIT,
            offset: deploymentsPage * LIMIT
          })
          const { totalCount, deployments } = response
          if (!enableFilterByApplicationId) {
            setEnableFilterByApplicationId(deployments.length > 0)
          }
          setFilteredDeployments([...deployments])
          setTotalCount(totalCount)
          setDeploymentsLoaded(true)
          setReloadDeployments(false)
        } catch (error) {
          console.error(`Error on getDetailDeployments ${error}`)
          setError(error)
          setShowErrorComponent(true)
        }
      }
      loadApplications()
    }
  }, [applicationsLoaded, deploymentsPage, reloadDeployments])

  useEffect(() => {
    async function loadApplications () {
      try {
        const applications = await getApplicationsRaw()
        setOptionApplications([{ label: 'All applications', value: '' }].concat(
          applications.map(application => ({
            value: application.id,
            label: application.name
          }))))
        setApplicationsLoaded(true)
      } catch (error) {
        console.error(`error ${error}`)
        setShowErrorComponent(true)
      }
    }
    loadApplications()
  }, [])

  useEffect(() => {
    if (filterDeploymentsByApplicationId.value !== null) {
      setReloadDeployments(true)
    }
  }, [filterDeploymentsByApplicationId])

  function handleSelectApplication (event) {
    setFilterDeploymentsByApplicationId({
      label: event.detail.label,
      value: event.detail.value
    })
  }

  if (showErrorComponent) {
    return <ErrorComponent error={error} onClickDismiss={() => setShowErrorComponent(false)} />
  }

  return (
    <div className={styles.containerDeployments} ref={ref}>
      <div className={styles.contentDeployments}>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.RocketIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Deployments</p>
          </div>
          <div className={styles.filtersContainer}>
            <Forms.Select
              defaultContainerClassName={styles.selectApplicationName}
              backgroundColor={RICH_BLACK}
              borderColor={WHITE}
              defaultOptionsClassName={typographyStyles.desktopButtonSmall}
              options={optionsApplications}
              onSelect={handleSelectApplication}
              optionsBorderedBottom={false}
              mainColor={WHITE}
              borderListColor={WHITE}
              value={filterDeploymentsByApplicationId.label}
              inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite} ${styles.heightSelectClass}`}
              paddingClass={styles.selectPaddingClass}
              disabled={!enableFilterByApplicationId}
              handleClickOutside
            />
          </div>
        </div>
        <TableAllDeployments deployments={filteredDeployments} deploymentsLoaded={deploymentsLoaded} />
        <Paginator pagesNumber={Math.ceil(totalCount / LIMIT)} onClickPage={(page) => setDeploymentsPage(page)} selectedPage={deploymentsPage} />
      </div>
    </div>
  )
})

export default AllDeployments
