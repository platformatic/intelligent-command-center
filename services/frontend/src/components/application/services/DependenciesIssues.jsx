import React, { useEffect, useState } from 'react'
import styles from './DependenciesIssues.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'

function DependenciesIssues ({
  outdatedDependencies = '-',
  dependencies = '-',
  values = []
}) {
  const [showNoResult, setShowNoResult] = useState(false)

  useEffect(() => {
    if (dependencies > 0 && outdatedDependencies > 0) {
      setShowNoResult(false)
    } else {
      setShowNoResult(true)
    }
  }, [dependencies])

  function getStyle (value) {
    const width = (value.value_perc?.toFixed(2)) + '%'
    return { width }
  }

  function renderComponent () {
    if (showNoResult) {
      return (
        <NoDataAvailable
          title='No Dependencies Issues'
          iconName='PlatformaticServiceIcon'
          containerClassName={styles.noDataAvailable}
        />
      )
    }

    return (
      <>
        <div className={`${commonStyles.miniFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
            <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{outdatedDependencies}</h4>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>of {dependencies}</span>
          </div>
          <p className={`${typographyStyles.desktopBodySmall} ${commonStyles.fullWidth} ${typographyStyles.textCenter} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Outdated</p>
        </div>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          {values.filter(value => (value?.value ?? 0) !== 0).map(value => (<div className={styles[value.className]} style={getStyle(value)} key={`${value.key_value}_perc`}>&nbsp;</div>))}
        </div>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
          {values.map((value, index) => (
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${index === 1 ? commonStyles.justifyEnd : ''}`} key={value.key_value}>
              <span className={styles[value.className]}>&nbsp;</span>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{value.label}</span>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{value.value}</span>
            </div>
          ))}
        </div>
      </>
    )
  }

  return renderComponent()
}

export default DependenciesIssues
