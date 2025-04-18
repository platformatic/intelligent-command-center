import React, { useState } from 'react'
import styles from './DeploymentHistory.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import TableDeployments from './TableDeployments'
import Paginator from '~/components/ui/Paginator'
import { useLoaderData } from 'react-router-dom'
import NoDataFound from '~/components/ui/NoDataFound'

export default function DeploymentHistory () {
  const LIMIT = 10
  const [deploymentsPage, setDeploymentsPage] = useState(0)
  const { deployments, totalCount } = useLoaderData()

  return (
    <div className={styles.container}>
      <div className={styles.content}>

        <div className={`${styles.container} ${commonStyles.tinyFlexBlock}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.DeploymentHistoryIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Deployment History</p>
          </div>
          {deployments.length === 0 && (
            <NoDataFound title='No Deployments yet' subTitle={<span>There’s no track of deployments.</span>} />

          )}
          {deployments.length > 0 && (
            <>
              <TableDeployments deployments={deployments} />
              <Paginator
                pagesNumber={Math.ceil(totalCount / LIMIT)}
                onClickPage={(page) => setDeploymentsPage(page)}
                selectedPage={deploymentsPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
