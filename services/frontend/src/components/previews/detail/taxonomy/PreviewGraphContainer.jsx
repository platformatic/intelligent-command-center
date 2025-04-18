import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './PreviewGraphContainer.module.css'
import { ButtonOnlyIcon, LoadingSpinnerV2 } from '@platformatic/ui-components'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import PreviewMermaid from './PreviewMermaid'
import { getChartForMermaidFromPreview } from '~/utilities/taxonomy'
import NoDataFound from '~/components/ui/NoDataFound'
import { renderToStaticMarkup } from 'react-dom/server'
import PreviewMermaidIngressController from './PreviewMermaidIngressController'
import PreviewMermaidService from './PreviewMermaidService'
import { DULLS_BACKGROUND_COLOR, RICH_BLACK, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'

function PreviewGraphContainer ({
  taxonomyPreviewLoaded = false,
  taxonomyPreview = {}
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [diagramApplication, setDiagramApplication] = useState({})
  const [taxonomy, setTaxonomy] = useState({})
  const applicationContainerRef = useRef(null)
  const MAX_SCALE = '5'
  const BASE_SCALE = '1'
  const MIN_SCALE = '0.5'
  const [diagramScale, setDiagramScale] = useState(BASE_SCALE)
  const [diagramProps, setDiagramProps] = useState({
    transform: `scale(${BASE_SCALE})`
    // overflow: 'auto'
  })
  useEffect(() => {
    if (taxonomyPreviewLoaded) {
      setInnerLoading(false)
      if (Object.keys(taxonomyPreview).length > 0 && (taxonomyPreview?.applications?.length ?? 0) > 0) {
        setShowNoResult(false)
        setTaxonomy(taxonomyPreview)
      } else {
        setShowNoResult(true)
      }
    }
  }, [taxonomyPreviewLoaded, taxonomyPreview])

  useEffect(() => {
    if (Object.keys(taxonomy).length > 0 && !taxonomy.html) {
      function createChart () {
        const updatedApplications = taxonomy.applications.map(application => {
          const { services, ...rest } = application
          const newServices = services.map(service => {
            return {
              ...service,
              html: renderToStaticMarkup(
                <PreviewMermaidService
                  {...service}
                />
              )
            }
          })
          return { ...rest, services: newServices }
        })
        taxonomy.applications = updatedApplications
        taxonomy.html = renderToStaticMarkup(<PreviewMermaidIngressController />)
        const chart = getChartForMermaidFromPreview(taxonomy, true)
        setDiagramApplication({ id: `preview-${taxonomy.id}`, chart })
        // setInnerLoading(false)
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

  function handleSvgViewbox () {
    setInnerLoading(false)
  }

  function zoomIn () {
    setDiagramScale((Number.parseFloat(diagramScale) + 1).toFixed(1))
  }

  function zoomOut () {
    setDiagramScale((Number.parseFloat(diagramScale) - 1).toFixed(1))
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
    if (showNoResult) { return <NoDataFound title='No differences found' subTitle={<span>We did'nt found differences between services <br />on main taxonomy and the preview selected</span>} /> }

    return (
      <>
        <div className={styles.buttonContainer}>
          <ButtonOnlyIcon
            textClass={typographyStyles.desktopButtonSmall}
            altLabel='Zoom in '
            paddingClass={commonStyles.smallButtonSquarePadding}
            color={WHITE}
            backgroundColor={RICH_BLACK}
            onClick={() => zoomIn()}
            hoverEffect={DULLS_BACKGROUND_COLOR}
            platformaticIcon={{ size: SMALL, iconName: 'ZoomInIcon', color: WHITE }}
            disabled={diagramScale === MAX_SCALE}
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
            {diagramApplication.chart && (<PreviewMermaid
              key={diagramApplication.id}
              chart={diagramApplication.chart}
              onLoadSendMermaidSvgDimension={handleSvgViewbox}
                                          />)}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className={`${styles.taxonomyViewContainer}`}>
      {renderComponent()}
    </div>
  )
}

PreviewGraphContainer.propTypes = {
  /**
   * taxonomyPreview
    */
  taxonomyPreview: PropTypes.object,
  /**
   * taxonomyLoaded
    */
  taxonomyPreviewLoaded: PropTypes.bool
}

export default PreviewGraphContainer
