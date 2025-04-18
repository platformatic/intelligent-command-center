import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import gridStyles from '~/styles/GridStyles.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TablePreviews.module.css'
import { BorderedBox, Button, LoadingSpinnerV2, SearchBarV2 } from '@platformatic/ui-components'
import { RICH_BLACK, WHITE, MAIN_GREEN, WARNING_YELLOW, ERROR_RED, MEDIUM, TINY, OPACITY_70 } from '@platformatic/ui-components/src/components/constants'
import { STATUS_CLOSED, STATUS_OPEN } from '~/ui-constants'
import RowPreview from './RowPreview'
import Forms from '@platformatic/ui-components/src/components/forms'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import NoDataFound from '~/components/ui/NoDataFound'
import Icons from '@platformatic/ui-components/src/components/icons'
import { ANY_RISK, HIGH_RISK, LOW_RISK, MEDIUM_RISK } from './previewUtils'
import Paginator from '~/components/ui/Paginator'

function TablePreviews ({
  previewsLoaded = false,
  previews = [],
  onClickViewDetail = () => { },
  setStatusOpen = () => { },
  statusOpen = true,
  onClickSynchronize = () => { },
  mainGeneration = {}
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [filteredPreviews, setFilteredPreviews] = useState([])
  const [optionsRisks, setOptionsRisks] = useState([])
  const [filterPreviewsByPRTitleOrNumber, setFilterPreviewsByPRTitleOrNumber] = useState('')
  const [filterPreviewsByStatus, setFilterPreviewsByStatus] = useState(statusOpen === true ? STATUS_OPEN : STATUS_CLOSED)
  const [filterPreviewsByRisks, setFilterPreviewsByRisks] = useState({ label: 'Any risk', value: ANY_RISK })
  const legendSchemaChanges = [{
    key_value: 'edited',
    label: 'Edited:',
    className: 'boxSchemaChangesEdited'
  }, {
    key_value: 'added',
    label: 'Added:',
    className: 'boxSchemaChangesAdded'
  }, {
    key_value: 'removed',
    label: 'Removed:',
    className: 'boxSchemaChangesRemoved'
  }]
  const [previewsPage, setPreviewsPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const LIMIT = 5

  useEffect(() => {
    if (previewsLoaded) {
      if (previews.length > 0) {
        setOptionsRisks([...getOptionsRisks()])
        // setFilteredPreviews([...previews].slice(previewsPage * LIMIT, (previewsPage + 1 ) * LIMIT))
      } else {
        setShowNoResult(true)
      }
      setInnerLoading(false)
    }
  }, [previewsLoaded, previews.length])

  useEffect(() => {
    if (filteredPreviews.length > 0) {
      setInnerLoading(false)
    }
  }, [filteredPreviews])

  useEffect(() => {
    if (previews.length > 0 && previewsPage >= 0) {
      if (filterPreviewsByRisks.value || filterPreviewsByPRTitleOrNumber || filterPreviewsByStatus) {
        let founds = [...previews]
        founds = founds.filter(filterPreviewsByRisks.value)

        if (filterPreviewsByStatus) {
          founds = founds.filter(preview => preview.open === (filterPreviewsByStatus === STATUS_OPEN))
        }
        if (filterPreviewsByPRTitleOrNumber && filterPreviewsByPRTitleOrNumber !== '') {
          founds = founds.filter(preview => {
            const currentPreviewResult = preview.pullRequests.find(pullRequest => {
              return (
                String(pullRequest.number).toLowerCase().includes(filterPreviewsByPRTitleOrNumber.toLowerCase()) ||
                pullRequest.title.toLowerCase().includes(filterPreviewsByPRTitleOrNumber.toLowerCase())
              )
            })
            return !!currentPreviewResult
          })
        }
        setTotalCount(founds.length)
        setFilteredPreviews([...founds].slice(previewsPage * LIMIT, (previewsPage + 1) * LIMIT))
      } else {
        setTotalCount(previews.length)
        setFilteredPreviews([...previews].slice(previewsPage * LIMIT, (previewsPage + 1) * LIMIT))
      }
    }
  }, [
    previews.length,
    filterPreviewsByRisks.value,
    filterPreviewsByPRTitleOrNumber,
    filterPreviewsByStatus,
    previewsPage
  ])

  function handleSelectRisk (event) {
    setFilterPreviewsByRisks({
      label: event.detail.label,
      value: event.detail.value
    })
  }

  function handleChangeStatus (value) {
    setStatusOpen(value)
    setFilterPreviewsByStatus(value ? STATUS_OPEN : STATUS_CLOSED)
    setPreviewsPage(0)
  }

  function onClearFilterSearchPreview () {
    setFilterPreviewsByPRTitleOrNumber('')
  }

  function onChangeFilterSearchPreview (value) {
    setFilterPreviewsByPRTitleOrNumber(value)
  }

  function getOptionsRisks () {
    return [{
      label: 'Any risk',
      value: ANY_RISK,
      iconName: 'CircleFullIcon',
      iconSize: TINY,
      iconColor: WHITE
    }, {
      label: 'Low Risk (<25%)',
      value: LOW_RISK,
      iconName: 'CircleFullIcon',
      iconSize: TINY,
      iconColor: MAIN_GREEN
    }, {
      label: 'Medium Risk (<60%)',
      value: MEDIUM_RISK,
      iconName: 'CircleFullIcon',
      iconSize: TINY,
      iconColor: WARNING_YELLOW
    }, {
      label: 'High Risk (>60%)',
      value: HIGH_RISK,
      iconName: 'CircleFullIcon',
      iconSize: TINY,
      iconColor: ERROR_RED
    }]
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
              text: 'Loading your previews...'
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
    if (showNoResult) { return <NoDataFound title='No Previews Deployed' subTitle={<span>There are no previews deployed.<br />Follow <a href='https://docs.platformatichq.com/docs/basic-usage/deploy' target='_blank' className={typographyStyles.textTertiaryBlue} rel='noreferrer'>our docs</a> to deploy a preview.</span>} /> }

    return (
      <div className={styles.contentTablePreviews}>
        <div className={styles.filtersContainer}>
          <Button
            label={`Open (${previews.filter(preview => preview.open).length})`}
            onClick={() => handleChangeStatus(true)}
            color={WHITE}
            backgroundColor={RICH_BLACK}
            paddingClass={commonStyles.smallButtonPadding}
            textClass={typographyStyles.desktopButtonSmall}
            selected={filterPreviewsByStatus === STATUS_OPEN}
            platformaticIcon={{ iconName: 'PullRequestIcon', color: WHITE }}
          />
          <Button
            label={`Closed (${previews.filter(preview => !(preview.open)).length})`}
            onClick={() => handleChangeStatus(false)}
            color={WHITE}
            backgroundColor={RICH_BLACK}
            paddingClass={commonStyles.smallButtonPadding}
            textClass={typographyStyles.desktopButtonSmall}
            selected={filterPreviewsByStatus === STATUS_CLOSED}
            platformaticIcon={{ iconName: 'CircleCheckMarkIcon', color: WHITE }}
            disabled={previews.filter(preview => !(preview.open)).length === 0}
          />
          <SearchBarV2
            placeholder='Search for an PR Title or Number'
            onClear={onClearFilterSearchPreview}
            onChange={onChangeFilterSearchPreview}
            inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
            paddingClass={styles.searchBarPaddingClass}
          />
          <Forms.Select
            defaultContainerClassName={styles.select}
            backgroundColor={RICH_BLACK}
            borderColor={WHITE}
            defaultOptionsClassName={typographyStyles.desktopButtonSmall}
            options={optionsRisks}
            onSelect={handleSelectRisk}
            optionsBorderedBottom={false}
            mainColor={WHITE}
            borderListColor={WHITE}
            value={filterPreviewsByRisks.label}
            inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite} ${styles.heightSelectClass}`}
            paddingClass={styles.selectPaddingClass}
            handleClickOutside
          />
        </div>
        <div className={styles.tablePreviews}>
          <div className={styles.tableHeaders}>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanLarge2}`}>
              <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Preview Generation</span>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanLarge5}`}>
              <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Preview Details</span>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanLarge3} ${styles.tableHeaderSchemaChanges}`}>
              <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Schema Changes</span>
              {filteredPreviews.length > 0 && (
                <div className={styles.headerSchemaChanges}>
                  {legendSchemaChanges.map(legend => (
                    <div className={`${commonStyles.tinyFlexRow}`} key={legend.key_value}>
                      <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{legend.label}</span>
                      <span className={styles[legend.className]}>&nbsp;</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanLarge2}`}>
              <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Deployment Risk</span>
            </div>
          </div>

          <div className={styles.wrapperContainerMainTaxonomy}>
            <BorderedBox color={WHITE} borderColorOpacity={OPACITY_70} backgroundColor={RICH_BLACK} classes={styles.boxContainerMainTaxonomy}>
              <div className={styles.taxonomyIconContainer}>
                <Icons.TaxonomyIcon color={WHITE} size={MEDIUM} />
              </div>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} `}>Main Taxonomy</span>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>(Generation {mainGeneration?.mainIteration ?? '-'})</span>
            </BorderedBox>
          </div>
          <div className={styles.containerRows}>
            {filteredPreviews.length > 0 && filteredPreviews.map((preview, index) => (
              <RowPreview
                key={preview.taxonomyId}
                {...preview}
                indexRow={index}
                onClickViewDetail={() => onClickViewDetail(preview)}
                onClickSynchronize={() => onClickSynchronize(preview)}
                synchronized={preview.taxonomyGeneration === mainGeneration?.mainIteration}
              />
            ))}
            {filteredPreviews.length === 0 && (
              <NoDataAvailable iconName='CodeTestingIcon' title={previews.length === 0 ? 'No Previews Available' : 'No data available for the search'} />
            )}
          </div>
        </div>
        {filteredPreviews.length > 0 && (
          <Paginator pagesNumber={Math.ceil(totalCount / LIMIT)} onClickPage={(page) => setPreviewsPage(page)} selectedPage={previewsPage} />
        )}
      </div>
    )
  }

  return (
    <div className={styles.containerTablePreviews}>
      {renderComponent()}
    </div>
  )
}

TablePreviews.propTypes = {
  /**
   * previewsLoaded
    */
  previewsLoaded: PropTypes.bool,
  /**
   * previews
    */
  previews: PropTypes.array,
  /**
   * onClickViewDetail
    */
  onClickViewDetail: PropTypes.func,
  /**
   * setStatusOpen
    */
  setStatusOpen: PropTypes.func,
  /**
   * statusOpen
    */
  statusOpen: PropTypes.bool,
  /**
   * onClickSynchronize
    */
  onClickSynchronize: PropTypes.func,
  /**
   * mainGeneration
    */
  mainGeneration: PropTypes.object
}

export default TablePreviews
