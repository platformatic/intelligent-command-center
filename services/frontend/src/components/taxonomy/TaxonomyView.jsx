import React, { useEffect, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TaxonomyView.module.css'
import { ButtonOnlyIcon, LoadingSpinnerV2, VerticalSeparator } from '@platformatic/ui-components'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import { WHITE, OPACITY_30, RICH_BLACK, DULLS_BACKGROUND_COLOR, SMALL } from '@platformatic/ui-components/src/components/constants'
import Mermaid from './Mermaid'
import { getApiMainTaxonomyGraph, getApiCompliancy } from '~/api'
import { getChartForMermaidFromTaxonomy } from '~/utilities/taxonomy'
import MermaidNodeService from './MermaidNodeService'
import NoDataFound from '~/components/ui/NoDataFound'
import { TAXONOMY_NOT_FOUND_GENERATION, HIGH_REQUEST_AMOUNT, MEDIUM_REQUEST_AMOUNT, SMALL_REQUEST_AMOUNT } from '~/ui-constants'
import MermaidNodeIngressController from './MermaidNodeIngressController'
import LineTaxonomy from '~/components/ui/LineTaxonomy'
import { getHumanReadableDependencies } from '~/utilities/dependencies'

function TaxonomyView ({
  version,
  onClickApplication = () => {},
  onClickService = () => {},
  onClickIngressController = () => {},
  restore = false,
  islatestGeneration = true,
  onError = () => {}
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [diagramApplication, setDiagramApplication] = useState({})
  const [taxonomy, setTaxonomy] = useState({})
  const [reloadTaxonomy, setReloadTaxonomy] = useState(true)
  const applicationContainerRef = useRef(null)
  const [viewBoxSvgDimension, setViewBoxSvgDimension] = useState(null)

  const MAX_SCALE = '5'
  const BASE_SCALE = '1'
  const MIN_SCALE = '0.5'
  const [diagramScale, setDiagramScale] = useState(BASE_SCALE)
  const [diagramProps, setDiagramProps] = useState({
    transform: `scale(${BASE_SCALE})`
    // overflow: 'auto'
  })

  useEffect(() => {
    if (Object.keys(version).length > 0 && version.id && reloadTaxonomy) {
      uiReset()
      async function loadTaxonomomy () {
        if (version.id !== TAXONOMY_NOT_FOUND_GENERATION) {
          try {
            const taxonomy = await getApiMainTaxonomyGraph(version.id)
            if (Object.keys(taxonomy).length > 0 && (taxonomy?.applications?.length ?? 0) > 0) {
              setTaxonomy(taxonomy)
              setReloadTaxonomy(false)
            } else {
              setShowNoResult(true)
              setInnerLoading(false)
            }
          } catch (error) {
            console.error(`Error on getApiMainTaxonomyGraph ${error}`)
            onError(error)
          }
        } else {
          setShowNoResult(true)
          setInnerLoading(false)
        }
      }
      loadTaxonomomy()
    }
  }, [version, reloadTaxonomy])

  useEffect(() => {
    if (restore) {
      setDiagramScale(BASE_SCALE)
    }
  }, [restore])

  useEffect(() => {
    if (Object.keys(taxonomy).length > 0 && !taxonomy.html) {
      async function createChart () {
        const updatedApplications = await Promise.all(taxonomy.applications.map(async (application) => {
          const report = await getApiCompliancy(taxonomy.id, application?.id)
          let reportServices = {}
          if (report.length > 0) {
            const ruleSet = report[0].ruleSet
            const index = Object.keys(report[0].ruleSet).find(rule => report[0].ruleSet[rule].name === 'outdated-npm-deps')
            reportServices = ruleSet[index]?.details?.services ?? {}
          }

          const { services, ...rest } = application
          const newServices = services.map(service => {
            let outdated = false
            if (Object.keys(reportServices[service.id] || {}).length > 0) {
              outdated = !(Object.keys(reportServices[service.id]).map(k => reportServices[service.id][k]).find(obj => obj.outdated) === undefined)
            }
            return {
              ...service,
              html: renderToStaticMarkup(
                <MermaidNodeService
                  {...service}
                  outdated={outdated}
                />
              )
            }
          })
          return { ...rest, services: newServices }
        }))
        taxonomy.applications = updatedApplications
        taxonomy.html = renderToStaticMarkup(<MermaidNodeIngressController />)
        setDiagramApplication({ chart: getChartForMermaidFromTaxonomy(taxonomy, true) })
        setInnerLoading(false)
      }
      createChart()
    }
  }, [Object.keys(taxonomy).length])

  useEffect(() => {
    if (!innerLoading) {
      setDiagramProps({
        transform: `scale(${diagramScale})`
        // overflow: diagramScale > BASE_SCALE ? 'hidden' : 'auto'
      })
    }
  }, [diagramScale, innerLoading])

  /* useEffect(() => {
    if (viewBoxSvgDimension && viewBoxSvgDimension?.width) {
      setDiagramScale(Math.floor(viewBoxSvgDimension.width / 3000))
    }
  }, [viewBoxSvgDimension]) */

  function refresh () {
    uiReset()
    setReloadTaxonomy(true)
  }

  function uiReset () {
    setTaxonomy({})
    setInnerLoading(true)
    setDiagramScale(BASE_SCALE)
    setDiagramApplication({})
    setDiagramProps({
      transform: `scale(${BASE_SCALE})`
      // overflow: 'auto'
    })
  }

  function handleSvgViewbox (viewBox = '') {
    const dimensions = viewBox.split(' ')
    if (dimensions.length > 0) {
      setViewBoxSvgDimension({ width: dimensions[2], height: dimensions[3] })
    }
  }

  function zoomIn () {
    setDiagramScale((Number.parseFloat(diagramScale) + 0.5).toFixed(1))
  }

  function zoomOut () {
    setDiagramScale((Number.parseFloat(diagramScale) - 0.5).toFixed(1))
  }

  function setCoordinatesForDiagramScrollTo (element) {
    if (element) {
      const applicationContainerRefBC = applicationContainerRef.current.getBoundingClientRect()
      const mermaidContainer = document.querySelector('div[class*="iccMermaid"').getBoundingClientRect()
      const elementCoordinates = element.getAttribute('transform').replace(/^translate\(/i, '').replace(/\)$/i, '').replace(/\s/g, '').split(',')
      let scrollingPositionX

      if (viewBoxSvgDimension.width <= mermaidContainer.width) {
        scrollingPositionX = Number.parseFloat(elementCoordinates[0] * diagramScale)
        // scrollingPositionX = Number.parseFloat(mermaidContainer.width * elementCoordinates[0] / viewBoxSvgDimension.width)
      } else {
        scrollingPositionX = Number.parseFloat(mermaidContainer.width * elementCoordinates[0] / viewBoxSvgDimension.width)
      }
      const scrollingPositionY = Number.parseFloat(mermaidContainer.height * elementCoordinates[1] / viewBoxSvgDimension.height)

      setTimeout(() => {
        const scrollTo = {
          top: scrollingPositionY - applicationContainerRefBC.height / 3,
          left: scrollingPositionX - applicationContainerRefBC.width / 3,
          behavior: 'smooth'
        }
        applicationContainerRef.current.scrollTo(scrollTo)
      }, 100)
    }
  }

  function retrieveApplicationInfo (applicationName) {
    const { id, services } = taxonomy.applications.find(application => application.name === applicationName)
    const elements = Array.from(document.querySelectorAll('g.cluster-label .nodeLabel'))
    let element = null
    if (elements.length > 0) {
      element = elements.find(ele => ele.textContent === applicationName)
    }
    setCoordinatesForDiagramScrollTo(element.parentNode.parentNode.parentNode)

    // first the entrypoint, then the others
    const orderedServices = services.filter(service => service.entrypoint).concat(services.filter(service => !service.entrypoint))

    onClickApplication({
      nodeDataId: applicationName,
      id,
      name: applicationName,
      services: orderedServices
    })
  }

  function retrieveServiceInfo (serviceId) {
    const applicationIdAndName = serviceId.split('!')
    const applicationId = applicationIdAndName[0]
    const name = applicationIdAndName[1]

    const application = taxonomy.applications.find(application => application.id === applicationId)
    const found = application.services.find(service => service.id === name)

    const { type = '', dependencies = [] } = found || {}

    setCoordinatesForDiagramScrollTo(document.querySelector(`g.node[data-id='${serviceId}']`))

    onClickService({
      nodeDataId: serviceId,
      name,
      type,
      dependencies: getHumanReadableDependencies(dependencies, taxonomy)
    })
  }

  function retrieveEntrypointsInfo (id) {
    let entrypoints = []
    taxonomy.applications.forEach(application => {
      entrypoints = entrypoints.concat(application.services.filter(service => service.entrypoint).map(service => ({ id: service.id, path: application.path, applicationName: application.name })))
    })
    setCoordinatesForDiagramScrollTo(document.querySelector(`g.node[data-id='${id}']`))
    onClickIngressController({
      nodeDataId: id,
      id,
      name: taxonomy.name,
      entrypoints
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
              text: 'Loading your chart...'
            }, {
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
              text: 'This process will just take a few seconds.'
            }]
          }}
          containerClassName={loadingSpinnerStyles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }
    if (showNoResult) { return <NoDataFound title='Taxonomy not available' subTitle={<span>To view the Taxonomy of you watt, start by <br /> adding a watt to the Intelligent command Center.</span>} /> }

    return (
      <>
        <div className={`${styles.taxonomyViewContent}`}>
          <div className={styles.buttonContainer}>
            <ButtonOnlyIcon
              textClass={typographyStyles.desktopButtonSmall}
              altLabel='Refresh'
              paddingClass={commonStyles.smallButtonSquarePadding}
              color={WHITE}
              backgroundColor={RICH_BLACK}
              onClick={() => refresh()}
              hoverEffect={DULLS_BACKGROUND_COLOR}
              platformaticIcon={{ size: SMALL, iconName: 'RunningIcon', color: WHITE }}
            />
            <ButtonOnlyIcon
              textClass={typographyStyles.desktopButtonSmall}
              altLabel='Zoom in '
              paddingClass={commonStyles.smallButtonSquarePadding}
              color={WHITE}
              backgroundColor={RICH_BLACK}
              onClick={() => zoomIn()}
              hoverEffect={DULLS_BACKGROUND_COLOR}
              platformaticIcon={{ size: SMALL, iconName: 'ZoomInIcon', color: WHITE }}
              disabled={diagramScale >= MAX_SCALE}
            />
            <ButtonOnlyIcon
              textClass={typographyStyles.desktopButtonSmall}
              altLabel='Zoom out'
              paddingClass={commonStyles.smallButtonSquarePadding}
              color={WHITE}
              backgroundColor={RICH_BLACK}
              onClick={() => zoomOut()}
              hoverEffect={DULLS_BACKGROUND_COLOR}
              platformaticIcon={{ size: SMALL, iconName: 'ZoomOutIcon', color: WHITE }}
              disabled={diagramScale === MIN_SCALE}
            />
          </div>
          <div ref={applicationContainerRef} className={styles.applicationContainer}>
            <div className={styles.applicationContent} style={{ ...diagramProps }}>
              <Mermaid
                key={diagramApplication.id}
                chart={diagramApplication.chart}
                onClickApplication={retrieveApplicationInfo}
                onClickService={retrieveServiceInfo}
                onClickIngressController={retrieveEntrypointsInfo}
                onLoadSendMermaidSvgDimension={handleSvgViewbox}
              />
            </div>
          </div>
        </div>
        {islatestGeneration && (
          <div className={`${commonStyles.mediumFlexRow} ${commonStyles.fullWidth} ${styles.legendContainer}`}>
            <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter}`}>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} `}>Response Time:</span>
              <span className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}><span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>No requests</span><hr className={styles.noRequestsLine} /></span>
              <span className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}><span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Fast</span><hr className={styles.fastResponseLine} /></span>
              <span className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}><span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Medium</span><hr className={styles.mediumResponseLine} /></span>
              <span className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}><span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Slow</span><hr className={styles.slowResponseLine} /></span>
            </div>

            <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />

            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>Requests Amount:</span>
              <span className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}><span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>No requests</span><LineTaxonomy /></span>
              <span className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}><span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Small</span><LineTaxonomy type={SMALL_REQUEST_AMOUNT} /></span>
              <span className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}><span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Medium</span><LineTaxonomy type={MEDIUM_REQUEST_AMOUNT} /></span>
              <span className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}><span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>High</span><LineTaxonomy type={HIGH_REQUEST_AMOUNT} /></span>
            </div>
          </div>
        )}
      </>

    )
  }

  return (
    <div className={`${styles.taxonomyViewContainer}`}>
      {renderComponent()}
    </div>
  )
}

export default TaxonomyView
