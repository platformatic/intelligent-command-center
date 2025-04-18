import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './PanelCompliancyService.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { WHITE, TRANSPARENT, WARNING_YELLOW, SMALL, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox } from '@platformatic/ui-components'
import DependenciesIssues from './DependenciesIssues'
import React, { useEffect, useState } from 'react'
import Forms from '@platformatic/ui-components/src/components/forms'
import NoDataAvailable from '~/components/ui/NoDataAvailable'

function Dependency ({ name, wanted = '-', current = '-', isOutdated = false }) {
  return (
    <div className={styles.boxDependency}>
      <div className={`${commonStyles.miniFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
          <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{name}</span>
          {isOutdated && <Icons.AlertIcon size={SMALL} color={WARNING_YELLOW} />}
        </div>
        <div className={`${commonStyles.tinyFlexRow} ${typographyStyles.desktopBodySmall}`}>
          <span className={` ${typographyStyles.opacity70}`}>Current version:</span>
          <span className={`${isOutdated ? typographyStyles.textWarningYellow : typographyStyles.textWhite}`}>{current ?? '-'}</span>
          <Icons.ArrowLongRightIcon size={SMALL} color={WHITE} />
          <span className={` ${typographyStyles.opacity70}`}>Latest version:</span>
          <span>{wanted ?? '-'}</span>
        </div>
      </div>
    </div>
  )
}

function PanelCompliancyService ({ id = '', reportServices = {} }) {
  const [showOnlyOutdated, setShowOnlyOutdated] = useState(false)
  const [dependencies, setDependencies] = useState([])
  const [filteredDependencies, setFilteredDependencies] = useState([])
  const [filteredDependenciesHasOutdatedDependencies, setFilteredDependenciesHasOutdatedDependencies] = useState(false)

  useEffect(() => {
    if (Object.keys(reportServices).length > 0 && dependencies.length === 0) {
      const localDep = Object.keys(reportServices).map(dependency => {
        const { wanted, current } = reportServices[dependency]
        const isOutdated = (current ?? '-') !== (wanted ?? '-')

        return {
          name: dependency,
          wanted,
          current,
          isOutdated
        }
      })
      setDependencies([...localDep])
      setFilteredDependenciesHasOutdatedDependencies(localDep.find(dep => dep.isOutdated) !== undefined)
    }
  }, [Object.keys(reportServices).length, dependencies.length])

  useEffect(() => {
    if (dependencies.length > 0) {
      if (showOnlyOutdated) {
        setFilteredDependencies(dependencies.filter(dep => dep.isOutdated))
      } else {
        setFilteredDependencies(dependencies)
      }
    }
  }, [showOnlyOutdated, dependencies.length])

  function renderContent () {
    if (filteredDependencies.length > 0) {
      return (
        <div className={styles.depContainer}>
          {filteredDependencies.map(dependency => <Dependency {...dependency} key={dependency.name} />)}
        </div>
      )
    }

    return (
      <NoDataAvailable
        title='No Dependencies found'
        iconName='PlatformaticServiceIcon'
        containerClassName={styles.noDataAvailable}
      />
    )
  }
  return (
    <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
      <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxDependenciesContainer}>
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${commonStyles.fullWidth} ${commonStyles.positionRelative}`}>
            <span className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Dependencies</span>

            {filteredDependenciesHasOutdatedDependencies && dependencies.length > 0 && (
              <div>
                <Forms.ToggleSwitch
                  label='Show only outdated'
                  labelClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
                  id='showOnlyOutdated'
                  onChange={() => setShowOnlyOutdated(!showOnlyOutdated)}
                  checked={showOnlyOutdated}
                  size={SMALL}
                />
              </div>
            )}
          </div>

          <DependenciesIssues
            outdatedDependencies={dependencies.filter(dep => dep.isOutdated).length}
            dependencies={dependencies.length}
            values={[{
              key_value: 'outdated_dependencies',
              label: 'Outdated:',
              className: 'boxOutdatedDependencies',
              value: dependencies.filter(dep => dep.isOutdated).length,
              value_perc: ((dependencies.filter(dep => dep.isOutdated).length / (dependencies.length ?? 1)) * 100)
            }, {
              key_value: 'up_to_date_dependencies',
              label: 'Up to Date:',
              className: 'boxUpToDateDependencies',
              value: dependencies.filter(dep => !dep.isOutdated).length,
              value_perc: ((dependencies.filter(dep => !dep.isOutdated).length / (dependencies.length ?? 1)) * 100)
            }]}
          />
          {renderContent()}
        </div>
      </BorderedBox>
    </div>
  )
}

PanelCompliancyService.propTypes = {
  /**
   * id
    */
  id: PropTypes.string,
  /**
   * reportServices
    */
  reportServices: PropTypes.object
}

export default PanelCompliancyService
