import React, { useEffect } from 'react'
import styles from './Services.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { PAGE_APPLICATION_DETAILS_SERVICES } from '~/ui-constants'
import useICCStore from '~/useICCStore'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import ListView from '~/components/application/services/ListView'

const Services = React.forwardRef(({ _ }, ref) => {
  const globalState = useICCStore()
  const {
    setNavigation,
    setCurrentPage
  } = globalState

  useEffect(() => {
    setCurrentPage(PAGE_APPLICATION_DETAILS_SERVICES)
    setNavigation({
      label: 'Services',
      handleClick: () => {
        setCurrentPage(PAGE_APPLICATION_DETAILS_SERVICES)
      },
      key: PAGE_APPLICATION_DETAILS_SERVICES,
      page: PAGE_APPLICATION_DETAILS_SERVICES
    }, 2)
  }, [])

  return (
    <div className={styles.servicesContainer} ref={ref}>
      <div className={styles.content}>
        <div className={`${styles.elementContainer} ${commonStyles.tinyFlexBlock}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.PlatformaticServiceIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Services</p>
          </div>
          <ListView />
        </div>
      </div>
    </div>
  )
})

export default Services
