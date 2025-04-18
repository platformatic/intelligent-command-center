import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TablePods.module.css'
import { BorderedBox, LoadingSpinnerV2 } from '@platformatic/ui-components'
import { RICH_BLACK, SMALL, TRANSPARENT, WHITE, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'
import RowPods from './RowPods'
import Forms from '@platformatic/ui-components/src/components/forms'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import {
  anyPerformance,
  goodPerformance,
  greatPerformance,
  lowPerformance,
  newestToOldest,
  oldestToNewest,
  worstToBest,
  bestToWorst
} from './podsUtils'
import { groupFilteredPods, getConfigurationRow } from '~/utilities/pods'

function TablePods ({
  podsLoaded = false,
  pods = [],
  optionsApplications = [],
  enableApplicationFilter = false,
  fromPreview = false,
  defaultFilterByApplication = {},
  onChangeFilterByApplication = () => {},
  applicationId,
  taxonomyId
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [filteredPods, setFilteredPods] = useState([])
  const [reloadPods, setReloadPods] = useState(true)
  const [optionsPerformance, setOptionsPerformance] = useState([])
  const [optionsSorting, setOptionsSorting] = useState([])
  const [filterPodsByPerformance, setFilterPodsByPerformance] = useState({ label: 'Any Health', value: anyPerformance })
  const [configurationRow, setConfigurationRow] = useState(0)
  const [filterLogsByApplication, setFilterLogsByApplication] = useState({})
  const [sortPodsBy, setSortPodsBy] = useState({
    label: 'Newest to oldest',
    value: newestToOldest
  })
  const [sortByPodsIconName, setSortByPodsIconName] = useState('SortDownArrowAndBarIcon')

  useEffect(() => {
    if (podsLoaded) {
      if (pods.length > 0) {
        setShowNoResult(false)
      } else {
        setShowNoResult(true)
      }
      setInnerLoading(false)
    }
  }, [podsLoaded, pods.length])

  useEffect(() => {
    if (pods.length > 0) {
      setOptionsPerformance([...getOptionsPerformance()])
      setOptionsSorting([...getOptionsSorting()])
      const configurationRow = getConfigurationRow([...pods].length)
      setConfigurationRow(configurationRow)
      setFilteredPods(groupFilteredPods([...pods], configurationRow))
    }
  }, [pods.length])

  useEffect(() => {
    if (filteredPods.length > 0) {
      setInnerLoading(false)
    }
  }, [filteredPods.length])

  useEffect(() => {
    if (Object.keys(defaultFilterByApplication).length > 0 && defaultFilterByApplication?.value !== filterLogsByApplication.value) {
      setFilterLogsByApplication({ ...defaultFilterByApplication })
    }
  }, [Object.keys(defaultFilterByApplication).length, defaultFilterByApplication?.value, filterLogsByApplication?.value])

  useEffect(() => {
    if (reloadPods && configurationRow > 0) {
      if (filterPodsByPerformance.value && sortPodsBy.value) {
        let founds = [...pods]
        founds = founds.filter(filterPodsByPerformance.value)

        if (sortPodsBy.value === bestToWorst || sortPodsBy.value === newestToOldest) {
          setSortByPodsIconName('SortDownArrowAndBarIcon')
        } else {
          setSortByPodsIconName('SortUpArrowAndBarIcon')
        }
        founds = sortPodsBy.value(founds)
        setFilteredPods(groupFilteredPods([...founds], configurationRow))
      } else {
        setFilteredPods(groupFilteredPods([...pods], configurationRow))
      }
      setReloadPods(false)
    }
  }, [
    reloadPods,
    configurationRow,
    filterPodsByPerformance.value,
    sortPodsBy.value
  ])

  function handleSelectPerformance (event) {
    setFilterPodsByPerformance({
      label: event.detail.label,
      value: event.detail.value
    })
    setReloadPods(true)
  }

  function handleSelectSorting (event) {
    setSortPodsBy({
      label: event.detail.label,
      value: event.detail.value
    })
    setReloadPods(true)
  }

  function getOptionsPerformance () {
    return [{
      label: 'Any Health',
      value: anyPerformance
    }, {
      label: 'Low',
      value: lowPerformance
    }, {
      label: 'Good',
      value: goodPerformance
    }, {
      label: 'Great',
      value: greatPerformance
    }]
  }

  function getOptionsSorting () {
    return [{
      label: 'Newest to oldest',
      value: newestToOldest
    }, {
      label: 'Oldest to newest',
      value: oldestToNewest
    }, {
      label: 'Best to worst',
      value: bestToWorst
    }, {
      label: 'Worst to best',
      value: worstToBest
    }]
  }

  function handleSelectApplication (event) {
    onChangeFilterByApplication({
      label: event.detail.label,
      value: event.detail.value
    })
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
              text: 'Loading your pods...'
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
    if (showNoResult) { return <NoDataAvailable iconName='FailureRateIcon' /> }

    return (
      <>
        {filteredPods.length > 0 && filteredPods.map((pods, index) => (
          <RowPods
            key={`${index}-${pods.length}`}
            groupPods={pods}
            howManyRows={filteredPods.length}
            evenRow={index % 2 === 0}
            configurationRow={configurationRow}
            firstRow={index === 0}
            applicationId={applicationId}
            taxonomyId={taxonomyId}
            fromPreview={fromPreview}
          />
        ))}
        {filteredPods.length === 0 && (
          <NoDataAvailable iconName='FailureRateIcon' title='No data available for the search' />
        )}
      </>
    )
  }

  return (
    <BorderedBox classes={styles.containerTablePods} color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN}>
      <div className={styles.contentTablePods}>
        <div className={`${styles.filtersContainer} ${enableApplicationFilter ? commonStyles.justifyBetween : commonStyles.justifyEnd}`}>
          {enableApplicationFilter && optionsApplications.length > 0 && filterLogsByApplication &&
            <div className={`${commonStyles.tinyFlexRow}`}>
              <Forms.Select
                defaultContainerClassName={styles.select}
                backgroundColor={RICH_BLACK}
                borderColor={WHITE}
                defaultOptionsClassName={typographyStyles.desktopButtonSmall}
                options={optionsApplications}
                disabled={optionsApplications.length <= 1}
                onSelect={handleSelectApplication}
                optionsBorderedBottom={false}
                mainColor={WHITE}
                borderListColor={WHITE}
                value={filterLogsByApplication.label}
                inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
                paddingClass={styles.selectPaddingClass}
                handleClickOutside
              />
            </div>}
          <div className={`${commonStyles.tinyFlexRow}`}>
            <Forms.Select
              defaultContainerClassName={styles.selectPerfomance}
              backgroundColor={RICH_BLACK}
              borderColor={WHITE}
              defaultOptionsClassName={typographyStyles.desktopButtonSmall}
              options={optionsPerformance}
              onSelect={handleSelectPerformance}
              optionsBorderedBottom={false}
              mainColor={WHITE}
              borderListColor={WHITE}
              value={filterPodsByPerformance.label}
              inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
              paddingClass={styles.selectPaddingClass}
              handleClickOutside
            />
            <Forms.Select
              defaultContainerClassName={styles.selectSorting}
              backgroundColor={RICH_BLACK}
              borderColor={WHITE}
              defaultOptionsClassName={typographyStyles.desktopButtonSmall}
              options={optionsSorting}
              onSelect={handleSelectSorting}
              optionsBorderedBottom={false}
              mainColor={WHITE}
              borderListColor={WHITE}
              value={sortPodsBy.label}
              inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
              beforeIcon={{
                iconName: sortByPodsIconName,
                color: WHITE,
                size: SMALL
              }}
              paddingClass={styles.selectPaddingClass}
              handleClickOutside
            />
          </div>
        </div>

        <div className={`${styles.tablePods} ${styles.containerPodsRows}`}>
          {renderComponent()}
        </div>
      </div>
    </BorderedBox>
  )
}

TablePods.propTypes = {
  /**
   * podsLoaded
    */
  podsLoaded: PropTypes.bool,
  /**
   * pods
    */
  pods: PropTypes.array,
  /**
   * optionsApplications
    */
  optionsApplications: PropTypes.array,
  /**
   * enableApplicationFilter
    */
  enableApplicationFilter: PropTypes.bool,
  /**
   * fromPreview
    */
  fromPreview: PropTypes.bool,
  /**
   * defaultFilterByApplication
    */
  defaultFilterByApplication: PropTypes.object,
  /**
   * onChangeFilterByApplication
    */
  onChangeFilterByApplication: PropTypes.func,
  /**
   * applicationId
   */
  applicationId: PropTypes.string,
  /**
   * taxonomyId
   */
  taxonomyId: PropTypes.string
}

export default TablePods
