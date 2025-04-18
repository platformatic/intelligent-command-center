import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './ModalTaxonomyGenerations.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MEDIUM, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import { PlatformaticIcon } from '@platformatic/ui-components'
import { useEffect, useState } from 'react'
import { getGroupedTaxonomyGeneration } from '~/utilities/taxonomy'

function TaxonomyGroupedElement ({
  onClick = () => {},
  id,
  label = '',
  latestGeneration = '',
  version = {}
}) {
  const [hover, setHover] = useState(false)
  const [className, setClassName] = useState(`${commonStyles.tinyFlexRow} ${commonStyles.cursorPointer} ${styles.taxonomyGroupedElement}`)
  const [labelClassName, setLabelClassName] = useState(`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${version.id !== id ? typographyStyles.opacity70 : ''}`)

  useEffect(() => {
    if (hover) {
      setClassName(`${commonStyles.tinyFlexRow} ${commonStyles.cursorPointer} ${styles.taxonomyGroupedElement} ${styles.taxonomyGroupedElementHover}`)
      setLabelClassName(`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`)
    } else {
      setClassName(`${commonStyles.tinyFlexRow} ${commonStyles.cursorPointer} ${styles.taxonomyGroupedElement}`)
      setLabelClassName(`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${version.id !== id ? typographyStyles.opacity70 : ''}`)
    }
  }, [hover])

  return (
    <div
      key={id}
      onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className={className}
      onClick={onClick}
    >
      <span className={labelClassName}>{label}</span>
      {latestGeneration === id && <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>(Last Generation)</span>}
    </div>
  )
}

function TaxonomyGrouped ({ collectionData, onClickSelectedVersion, latestGeneration = '', version = {} }) {
  const [expanded, setExpanded] = useState(false)
  const { label = '', elements = [] } = collectionData
  return (
    <>
      <div className={`${commonStyles.smallFlexRow} ${commonStyles.justifyBetween} ${commonStyles.itemsCenter} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexRow}`}>
          <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{label}</span>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>({elements.length} Generation{elements.length > 1 ? 's' : ''})</span>
        </div>
        <PlatformaticIcon internalOverHandling iconName={!expanded ? 'ArrowRightIcon' : 'ArrowDownIcon'} color={WHITE} size={SMALL} onClick={() => setExpanded(!expanded)} />
      </div>
      {expanded && (
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
          {elements.map(element => (
            <TaxonomyGroupedElement
              key={element.id}
              latestGeneration={latestGeneration}
              onClick={() => {
                if (elements.length > 1) {
                  return onClickSelectedVersion({
                    id: element.id,
                    label: `${label} - ${element.label}`
                  })
                }
                return {}
              }}
              version={version}
              {...element}
            />
          )
          )}
        </div>
      )}
    </>
  )
}

function ModalTaxonomyGenerations ({
  taxonomyGenerations = [],
  onClickSelectedVersion = () => {},
  latestGeneration = '',
  version = {}
}) {
  const groupedTaxonomy = getGroupedTaxonomyGeneration(taxonomyGenerations)

  return (
    <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
        <Icons.TaxonomyIcon
          color={WHITE}
          size={MEDIUM}
        />
        <div>
          <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Taxonomy Generations</p>
        </div>
      </div>

      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${styles.taxonomyGroupContainer}`}>
        {Object.keys(groupedTaxonomy).map(group => (
          <div key={group} className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
              <hr className={styles.divider} />
              <p className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.textCenter} ${typographyStyles.opacity70}`}>{group}</p>
              <hr className={styles.divider} />
            </div>
            {groupedTaxonomy[group].map(dateSameGroup => <TaxonomyGrouped key={dateSameGroup.label} collectionData={dateSameGroup} onClickSelectedVersion={onClickSelectedVersion} latestGeneration={latestGeneration} version={version} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

ModalTaxonomyGenerations.propTypes = {
  /**
   * latestGeneration
    */
  latestGeneration: PropTypes.string,
  /**
   * taxonomyGenerations
    */
  taxonomyGenerations: PropTypes.array,
  /**
   * onClickSelectedVersion
    */
  onClickSelectedVersion: PropTypes.func,
  /**
   * version
    */
  version: PropTypes.object

}

export default ModalTaxonomyGenerations
