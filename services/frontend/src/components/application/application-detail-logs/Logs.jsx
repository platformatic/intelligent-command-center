import React, { useEffect } from 'react'
import { PAGE_APPLICATION_DETAIL_LOGS } from '~/ui-constants'
import useICCStore from '~/useICCStore'
import ApplicationLogs from '~/components/application-logs/ApplicationLogs'
import styles from './Logs.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'

const Logs = React.forwardRef(({ _ }, ref) => {
  const globalState = useICCStore()
  const { applicationSelected, taxonomySelected, setNavigation, setCurrentPage } = globalState

  useEffect(() => {
    setCurrentPage(PAGE_APPLICATION_DETAIL_LOGS)

    setNavigation({
      label: 'Logs',
      handleClick: () => {
        setCurrentPage(PAGE_APPLICATION_DETAIL_LOGS)
      },
      key: PAGE_APPLICATION_DETAIL_LOGS,
      page: PAGE_APPLICATION_DETAIL_LOGS
    }, 2)
  }, [])

  function renderComponent () {
    return (
      <div className={styles.logsContent}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.CLIIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Logs</p>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>
              (Last 5 minutes)
            </span>
          </div>
        </div>
        <ApplicationLogs applicationId={applicationSelected?.id} taxonomyId={taxonomySelected?.id} borderedBoxContainerClass={styles.logsBorderexBoxContainer} />
      </div>
    )
  }

  return (
    <div className={styles.logsContainer} ref={ref}>
      {renderComponent()}
    </div>
  )
})

export default Logs
