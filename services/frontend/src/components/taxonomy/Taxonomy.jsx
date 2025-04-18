import React, { useEffect, useState } from 'react'
import styles from './Taxonomy.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import modalStyles from '~/styles/ModalStyles.module.css'
import { PAGE_TAXONOMY, TAXONOMY_NOT_FOUND_GENERATION } from '~/ui-constants'
import useICCStore from '~/useICCStore'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MEDIUM, OPACITY_30, RICH_BLACK, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import TaxonomyView from './TaxonomyView'
import { getApiTaxonomyGenerations } from '~/api'
import ModalTaxonomyGenerations from './ModalTaxonomyGenerations'
import PanelTaxonomyApplication from './PanelTaxonomyApplication'
import PanelTaxonomyService from './PanelTaxonomyService'
import PanelTaxonomyIngressController from './PanelTaxonomyIngressController'
import RightPanel from '~/components/ui/RightPanel'
import { Button, ModalDirectional, VerticalSeparator } from '@platformatic/ui-components'
import ErrorComponent from '~/components/errors/ErrorComponent'

const Taxonomy = React.forwardRef(({ _ }, ref) => {
  const globalState = useICCStore()
  const {
    setNavigation,
    setCurrentPage
  } = globalState
  const [version, setVersion] = useState({})
  const [latestGeneration, setLatestGeneration] = useState(null)
  const [showModalVersions, setShowModalVersions] = useState(false)
  const [showPanelApplication, setShowPanelApplication] = useState(false)
  const [showPanelService, setShowPanelService] = useState(false)
  const [showPanelIngressController, setShowPanelIngressController] = useState(false)
  const [rightPanel, setRightPanel] = useState({ show: false, key: null })
  const [taxonomyGenerations, setTaxonomyGenerations] = useState([])
  const [genericProps, setGenericProps] = useState({})
  const [animationClassName, setAnimationClassName] = useState('')
  const [hightLightMermaid, setHightLightMermaid] = useState(null)
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setNavigation({
      label: 'Taxonomy',
      handleClick: () => {
        setCurrentPage(PAGE_TAXONOMY)
      },
      key: PAGE_TAXONOMY,
      page: PAGE_TAXONOMY
    }, 0)
  }, [])

  useEffect(() => {
    async function loadTaxonomomyVersions () {
      try {
        const taxonomyGenerations = await getApiTaxonomyGenerations({ skipFirst: true })
        if (taxonomyGenerations.length > 0) {
          setTaxonomyGenerations(taxonomyGenerations)
          setLatestGeneration(taxonomyGenerations[0].id)
          setVersion({ id: taxonomyGenerations[0].id, label: '' })
        } else {
          setVersion({ id: TAXONOMY_NOT_FOUND_GENERATION })
        }
      } catch (error) {
        setError(error)
        setShowErrorComponent(true)
      }
    }
    loadTaxonomomyVersions()
  }, [])

  useEffect(() => {
    let element = document.querySelector('g.node[class*="serviceClassSelected"]')
    if (element) element.classList.remove('serviceClassSelected')

    element = document.querySelector('g.cluster[class*="applicationSelected"]')
    if (element) element.classList.remove('applicationSelected')

    element = document.querySelector('g.node[class*="ingressControllerClassSelected"]')
    if (element) element.classList.remove('ingressControllerClassSelected')

    if (hightLightMermaid) {
      let elements = null
      switch (hightLightMermaid.type) {
        case 'ingressController':
          element = document.querySelector(`g.node[data-id='${hightLightMermaid.dataId}']`)
          if (element) {
            element.classList.add('ingressControllerClassSelected')
          }
          break

        case 'application':
          elements = Array.from(document.querySelectorAll('g.cluster-label .nodeLabel'))
          if (elements.length > 0) {
            element = elements.find(ele => ele.textContent === hightLightMermaid.nodeLabel)
            if (element) {
              element.parentNode.parentNode.parentNode.parentNode.classList.add('applicationSelected')
            }
          }
          break

        default:
          element = document.querySelector(`g.node[data-id='${hightLightMermaid.dataId}']`)
          if (element) {
            element.classList.add('serviceClassSelected')
          }
      }
    }
  }, [hightLightMermaid])

  function onClickChangeVersion () {
    setShowModalVersions(true)
  }
  function handleCloseModal () {
    setShowModalVersions(false)
  }
  function handleClickRightPanel () {
    if (!rightPanel.show) {
      setAnimationClassName(styles.animationReduce)
      setRightPanel({ show: true, key: new Date() })
    }
  }

  function handleCloseRightPanel () {
    setAnimationClassName(styles.animationIncrease)
    setHightLightMermaid(null)
    setRightPanel({ show: false, key: null })
    setShowPanelApplication(false)
    setShowPanelService(false)
    setShowPanelIngressController(false)
    setGenericProps({})
  }
  function handleClickSelectedVersion (value) {
    setVersion(value)
    setShowModalVersions(false)
    handleCloseRightPanel()
  }
  function handleClickApplication ({ nodeDataId = '', id = '', name = '', services = [] }) {
    setHightLightMermaid({ type: 'application', nodeLabel: nodeDataId })
    setGenericProps({ id, services, name })
    handleClickRightPanel()
    setShowPanelService(false)
    setShowPanelApplication(true)
    setShowPanelIngressController(false)
  }
  function handleClickService ({ nodeDataId = '', id, name = '', type = '', plugins = [], dependencies = [] }) {
    setHightLightMermaid({ type: 'service', dataId: nodeDataId })
    setGenericProps({ name, type, plugins, dependencies })
    handleClickRightPanel()
    setShowPanelService(true)
    setShowPanelApplication(false)
    setShowPanelIngressController(false)
  }
  function handleClickIngressController ({ nodeDataId = '', id, name = '', entrypoints = [] }) {
    setHightLightMermaid({ type: 'ingressController', dataId: nodeDataId })
    setGenericProps({ id, name, entrypoints })
    handleClickRightPanel()
    setShowPanelService(false)
    setShowPanelApplication(false)
    setShowPanelIngressController(true)
  }

  function handleTaxonomyGraphError (error) {
    setError(error)
    setShowErrorComponent(true)
  }

  function renderHeader () {
    return (
      <>
        <Button
          label={latestGeneration === version.id ? 'Last Generation' : version?.label ?? '-'}
          type='button'
          color={WHITE}
          backgroundColor={RICH_BLACK}
          paddingClass={commonStyles.smallButtonPadding}
          textClass={typographyStyles.desktopButtonSmall}
          onClick={() => onClickChangeVersion()}
          platformaticIconAfter={{ iconName: 'InternalLinkIcon', color: WHITE, size: SMALL }}
        />
        {latestGeneration === version.id && (
          <>

            <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>(Data is collected every 5 minutes)</span>
          </>
        )}
      </>
    )
  }

  if (showErrorComponent) {
    return <ErrorComponent error={error} message={error.message} onClickDismiss={() => setShowErrorComponent(false)} />
  }

  return (
    <>
      <div className={styles.taxonomyContainer} ref={ref}>
        <div className={`${styles.taxonomyContent} ${animationClassName}`}>
          <div className={`${styles.taxonomyElementContainer}`}>
            <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                <Icons.TaxonomyIcon color={WHITE} size={MEDIUM} />
                <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Taxonomy</p>
              </div>
              {version.id !== TAXONOMY_NOT_FOUND_GENERATION && renderHeader()}
            </div>
            <TaxonomyView
              version={version}
              key={version.id}
              onClickApplication={handleClickApplication}
              onClickService={handleClickService}
              onClickIngressController={handleClickIngressController}
              restore={!rightPanel.show}
              islatestGeneration={latestGeneration === version.id}
              onError={handleTaxonomyGraphError}
            />
          </div>
        </div>
        {rightPanel.show && (
          <RightPanel
            onClosePanel={() => handleCloseRightPanel()}
          >
            {showPanelApplication && (
              <PanelTaxonomyApplication
                key={`pta-${genericProps.id}`}
                {...genericProps}
                mainTaxonomyId={taxonomyGenerations.find(taxonomyGeneration => taxonomyGeneration.id === version.id).taxonomyId}
                islatestGeneration={latestGeneration === version.id}
              />)}
            {showPanelService && (<PanelTaxonomyService key={`pts-${genericProps.name}`} {...genericProps} />)}
            {showPanelIngressController && (<PanelTaxonomyIngressController key={`pts-${genericProps.id}`} {...genericProps} />)}
          </RightPanel>
        )}
      </div>
      {showModalVersions && (
        <ModalDirectional
          key='modalVersions'
          setIsOpen={() => handleCloseModal()}
          classNameModalLefty={modalStyles.modalLeftySmallPadding}
          smallLayout
          permanent
        >
          <ModalTaxonomyGenerations
            taxonomyGenerations={taxonomyGenerations}
            onClickSelectedVersion={handleClickSelectedVersion}
            latestGeneration={latestGeneration}
            version={version}
          />
        </ModalDirectional>
      )}
    </>
  )
})

export default Taxonomy
