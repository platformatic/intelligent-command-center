import React from 'react'
import { WHITE, OPACITY_15, WARNING_YELLOW, OPACITY_100, BLACK_RUSSIAN, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox } from '@platformatic/ui-components'
import styles from './ServiceElement.module.css'
import StatusPill from '../../common/StatusPill'
import ThreadUsage from '../../metrics/ThreadUsage'
import { useRouteLoaderData } from 'react-router-dom'

function ServiceElement ({
  service = {},
  applicationEntrypoint = false,
  onClickService = () => {},
  threads = [],
  dependencies = {}
}) {
  function getOutdatedDependencies () {
    return Object.keys(dependencies).reduce((partialSum, dependency) => {
      const { current, wanted } = dependencies[dependency]
      return partialSum + (current !== wanted ? 1 : 0)
    }, 0)
  }
  const { application } = useRouteLoaderData('appRoot')
  return (
    <BorderedBox
      classes={`${commonStyles.buttonSquarePadding} ${commonStyles.fullWidth} ${styles.serviceElementBox}`}
      backgroundColor={BLACK_RUSSIAN}
      color={TRANSPARENT}
      backgroundColorOpacity={OPACITY_100}
      internalOverHandling
      backgroundColorOver={WHITE}
      backgroundColorOpacityOver={OPACITY_15}
      borderColorOpacityOver={OPACITY_100}
      clickable
      onClick={onClickService}
    >
      <div className={styles.container}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} `}>
          <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}>{service.id}</span>
          {applicationEntrypoint && (
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>(Watt Entrypoint)</span>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>Dependencies</div>
            <div>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{Object.keys(dependencies)?.length ?? 0}</span>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>
                <StatusPill
                  backgroundColor={WARNING_YELLOW}
                  status={`${getOutdatedDependencies()} outdated`}
                />
              </span>
            </div>
          </div>
        </div>
        <ThreadUsage
          data={threads}
          serviceId={service.id}
          applicationId={application.id}
        />
      </div>
    </BorderedBox>
  )
}

export default ServiceElement
