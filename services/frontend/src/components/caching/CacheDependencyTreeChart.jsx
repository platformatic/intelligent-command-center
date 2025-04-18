import React, { useRef, useState, useEffect } from 'react'
import styles from './CacheDependencyTreeChart.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataFound from '~/components/ui/NoDataFound'
import { LoadingSpinnerV2, ButtonOnlyIcon } from '@platformatic/ui-components'
import { SMALL, WHITE, RICH_BLACK, DULLS_BACKGROUND_COLOR } from '@platformatic/ui-components/src/components/constants'
import MermaidChart from './MermaidChart'
import { getCacheDependenciesTreeChart } from '~/utilities/caching'

export default function CachedDependencyTreeChart ({
  entry = {}
}) {
  const MAX_SCALE = '5'
  const BASE_SCALE = '1'
  const MIN_SCALE = '0.5'
  const [diagramScale, setDiagramScale] = useState(BASE_SCALE)
  const [diagramProps, setDiagramProps] = useState({
    transform: `scale(${BASE_SCALE})`
  })
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [reloadChart, setReloadChart] = useState(true)
  const [chart, setChart] = useState('')
  const serviceTreeContainerRef = useRef(null)

  useEffect(() => {
    if (!innerLoading) {
      setDiagramProps({
        transform: `scale(${diagramScale})`
      })
    }
  }, [diagramScale, innerLoading])

  useEffect(() => {
    setInnerLoading(true)
    async function loadDepedencyTreeChart () {
      if (!reloadChart) {
        setInnerLoading(false)
        return
      }
      const { id, dependents = [], traces = [], applications = [] } = entry
      const returnedChart = getCacheDependenciesTreeChart(id, traces, dependents, applications)
      setChart(returnedChart)
      if (!returnedChart) {
        setShowNoResult(true)
        setInnerLoading(false)
      } else {
        setInnerLoading(false)
        setReloadChart(false)
      }
    }
    loadDepedencyTreeChart()
  }, [reloadChart])

  function zoomIn () {
    setDiagramScale((Number.parseFloat(diagramScale) + 0.5).toFixed(1))
  }

  function zoomOut () {
    setDiagramScale((Number.parseFloat(diagramScale) - 0.5).toFixed(1))
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
    if (showNoResult) { return <NoDataFound title='Not available' subTitle='' /> }

    return (
      <>
        <div className={styles.chartViewContent}>
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
          <div ref={serviceTreeContainerRef} className={styles.applicationContainer}>
            <div className={styles.applicationContent} style={{ ...diagramProps }}>
              <MermaidChart key={entry.id} chart={chart} />
            </div>
          </div>

        </div>
      </>
    )
  }
  return (

    <div className={`${styles.chartViewContainer}`}>
      {renderComponent()}
    </div>
  )
}
