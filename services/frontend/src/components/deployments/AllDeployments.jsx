import React, { useEffect, useState } from 'react'
import styles from './AllDeployments.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { RICH_BLACK, MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import Forms from '@platformatic/ui-components/src/components/forms'
import Paginator from '~/components/ui/Paginator'
import { useLoaderData } from 'react-router-dom'
import TableDeployments from '../application/deployment_history/TableDeployments'

const AllDeployments = React.forwardRef(({ _ }, ref) => {
  const LIMIT = 10
  const [deploymentsPage, setDeploymentsPage] = useState(0)
  const [filteredDeployments, setFilteredDeployments] = useState([])
  const [optionsApplications, setOptionApplications] = useState([])
  const [filterDeploymentsByApplicationId, setFilterDeploymentsByApplicationId] = useState({ label: 'All applications', value: '' })
  const { deployments, totalCount, applications } = useLoaderData()

  useEffect(() => {
    setFilteredDeployments(deployments)
  }, [])

  useEffect(() => {
    if (filterDeploymentsByApplicationId.value === '') {
      setFilteredDeployments(deployments)
    } else {
      setFilteredDeployments(deployments.filter(deployment => deployment.applicationId === filterDeploymentsByApplicationId.value))
    }
  }, [filterDeploymentsByApplicationId])

  useEffect(() => {
    setOptionApplications([{ label: 'All applications', value: '' }].concat(
      applications.map(application => ({
        value: application.id,
        label: application.name
      }))))
  }, [])

  function handleSelectApplication (event) {
    setFilterDeploymentsByApplicationId({
      label: event.detail.label,
      value: event.detail.value
    })
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
              handleClickOutside
            />
          </div>
        </div>
        <TableDeployments deployments={filteredDeployments} withApplicationName />
        <Paginator pagesNumber={Math.ceil(totalCount / LIMIT)} onClickPage={(page) => setDeploymentsPage(page)} selectedPage={deploymentsPage} />
      </div>
    </div>
  )
})

export default AllDeployments
