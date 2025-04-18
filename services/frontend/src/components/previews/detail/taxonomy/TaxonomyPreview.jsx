import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TaxonomyPreview.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { ERROR_RED, MAIN_GREEN, RICH_BLACK, SMALL, TERTIARY_BLUE, WARNING_YELLOW, WHITE, BLACK_RUSSIAN, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Button } from '@platformatic/ui-components'
import ErrorComponent from '~/components/errors/ErrorComponent'
import { getApiPreviewTaxonomy } from '~/api'
import PreviewGraphContainer from './PreviewGraphContainer'
import RightPanelPreviewApplicationServices from './RightPanelPreviewApplicationServices'
import PanelPreviewApplicationAndServiceChanges from './PanelPreviewApplicationAndServiceChanges'

function TaxonomyPreview ({
  taxonomyGeneration,
  taxonomyId,
  mainGeneration,
  onClickSynchronize
}) {
  const [taxonomyPreviewLoaded, setTaxonomyPreviewLoaded] = useState(false)
  const [taxonomyPreview, setTaxonomyPreview] = useState({})
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [showPanelServicesChanges, setShowPanelServicesChanges] = useState(false)
  const [allChanges, setAllChanges] = useState([])
  const [disableViewChangeDetails, setDisableViewChangeDetails] = useState(true)
  const [animationClassName, setAnimationClassName] = useState('')
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

  useEffect(() => {
    async function loadTaxonomomy () {
      try {
        const { edited = [], removed = [], added = [], taxonomy } = await getApiPreviewTaxonomy(taxonomyId)
        setTaxonomyPreview(taxonomy)
        setTaxonomyPreviewLoaded(true)
        setAllChanges([{
          key: 'edited',
          label: 'Edited',
          labelClassName: `${typographyStyles.desktopOtherOverlineSmallest} ${typographyStyles.textTertiaryBlue}`,
          tagBackgroundColor: TERTIARY_BLUE,
          tagIconName: 'EditIcon',
          tagIconColor: TERTIARY_BLUE,
          services: edited
        }, {
          key: 'added',
          label: 'Added',
          labelClassName: `${typographyStyles.desktopOtherOverlineSmallest} ${typographyStyles.textMainGreen}`,
          tagBackgroundColor: MAIN_GREEN,
          services: added,
          tagIconName: 'AddIcon',
          tagIconColor: MAIN_GREEN
        }, {
          key: 'removed',
          label: 'Removed',
          labelClassName: `${typographyStyles.desktopOtherOverlineSmallest} ${typographyStyles.textErrorRed}`,
          tagBackgroundColor: ERROR_RED,
          services: removed,
          tagIconName: 'TrashIcon',
          tagIconColor: ERROR_RED
        }])
        setDisableViewChangeDetails(edited.length === 0 && removed.length === 0 && added.length === 0)
      } catch (error) {
        console.error(`Error on getApiPreviewTaxonomy ${error}`)
        setError(error)
        setShowErrorComponent(true)
      }
    }
    loadTaxonomomy()
  }, [])

  if (showErrorComponent) {
    return <ErrorComponent error={error} message={error.message} onClickDismiss={() => setShowErrorComponent(false)} />
  }

  function handleToggleRightPanel () {
    if (showPanelServicesChanges) {
      setAnimationClassName(styles.animationIncrease)
      setShowPanelServicesChanges(false)
    } else {
      setAnimationClassName(styles.animationReduce)
      setShowPanelServicesChanges(true)
    }
  }

  return (
    <div className={`${commonStyles.mediumFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsStart} ${styles.taxonomyPreviewContainer}`}>
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth} ${styles.containerGraph}`}>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${styles.itemsEnd} ${commonStyles.justifyEnd} `}>
          <BorderedBox classes={styles.borderexBoxContainerSynchronization} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
              {taxonomyGeneration !== mainGeneration?.mainIteration
                ? (
                  <>
                    <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Sync on generation:</span>
                    <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWarningYellow}`}>{mainGeneration?.mainIteration}</span>
                    <Icons.AlertIcon size={SMALL} color={WARNING_YELLOW} />
                    <Icons.ArrowLongRightIcon size={SMALL} color={WHITE} />
                    <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{taxonomyGeneration}</span>
                    <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textTertiaryBlue} ${commonStyles.cursorPointer}`} onClick={() => onClickSynchronize()}>Synchronize</span>
                  </>
                  )
                : (
                  <>
                    <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Sync on generation:</span>
                    <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{taxonomyGeneration}</span>
                  </>
                  )}
            </div>
          </BorderedBox>

          <Button
            label={showPanelServicesChanges ? 'Hide changes details' : 'View changes details'}
            onClick={() => handleToggleRightPanel()}
            color={WHITE}
            backgroundColor={RICH_BLACK}
            paddingClass={commonStyles.smallButtonPadding}
            textClass={typographyStyles.desktopButtonSmall}
            disabled={disableViewChangeDetails}
            platformaticIcon={{ iconName: 'CheckListReviewIcon', size: SMALL, color: WHITE }}
          />

        </div>
        <div className={`${styles.taxonomyGraphAndRightPanelContainer} ${animationClassName}`}>
          <BorderedBox classes={styles.borderedBoxContainerGraph} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
            <PreviewGraphContainer taxonomyPreviewLoaded={taxonomyPreviewLoaded} taxonomyPreview={taxonomyPreview} />
          </BorderedBox>
          {showPanelServicesChanges && (
            <RightPanelPreviewApplicationServices
              onClosePanel={() => handleToggleRightPanel()}
            >
              <PanelPreviewApplicationAndServiceChanges allChanges={allChanges} />
            </RightPanelPreviewApplicationServices>
          )}
        </div>

        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Taxonomy Applications and Services changes:</span>
          {legendSchemaChanges.map(legend => (
            <div className={`${commonStyles.tinyFlexRow}`} key={legend.key_value}>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{legend.label}</span>
              <span className={styles[legend.className]}>&nbsp;</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

TaxonomyPreview.propTypes = {
  /**
   * taxonomyId
   */
  taxonomyId: PropTypes.string,
  /**
   * taxonomyGeneration
   */
  taxonomyGeneration: PropTypes.number,
  /**
   * mainGeneration
   */
  mainGeneration: PropTypes.object,
  /**
   * onClickSynchronize
   */
  onClickSynchronize: PropTypes.func
}

export default TaxonomyPreview
