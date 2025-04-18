import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { WHITE, BLACK_RUSSIAN, TRANSPARENT, RICH_BLACK, OPACITY_30 } from '@platformatic/ui-components/src/components/constants'
import styles from './NodeJSMetric.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, LoadingSpinnerV2, VerticalSeparator } from '@platformatic/ui-components'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import NodeJSMetricChart from '~/components//metrics/NodeJSMetricChart'
import LatencyChart from '~/components//metrics/LatencyChart'
import { POSITION_ABSOLUTE, POSITION_FIXED } from '~/ui-constants'
import colorSetMem from '~/components/metrics/memory.module.css'
import colorSetCpu from '~/components/metrics/cpu.module.css'
import colorSetLatency from '~/components/metrics/latency.module.css'

function NodeJSMetric ({
  title = '',
  metricURL = '',
  initialLoading = true,
  dataValues = [],
  unit = '',
  options = [{ label: '', internalKey: '', unit: '' }],
  backgroundColor = BLACK_RUSSIAN,
  chartTooltipPosition = POSITION_ABSOLUTE
}) {
  const [showNoResult, setShowNoResult] = useState(true)
  const [seriesValues, setSeriesValues] = useState([])
  const [borderexBoxClassName, setBorderexBoxClassName] = useState(`${styles.borderexBoxContainer} ${styles.borderedBoxHeigthLoading}`)
  const [lowerMaxY, setLowerMaxY] = useState(10)
  const colorStyles = metricURL === 'mem' ? colorSetMem : metricURL === 'cpu' ? colorSetCpu : colorSetLatency

  useEffect(() => {
    if (!initialLoading) {
      setBorderexBoxClassName(`${styles.borderexBoxContainer}`)
      let newValues = []
      let lowerMaxY = 0
      if (dataValues.length > 0) {
        if (metricURL === 'latency') {
          newValues = dataValues.map(({ date, ...rest }) => ({
            time: new Date(date),
            ...rest
          }))
        } else {
          dataValues.forEach(dataValue => {
            newValues.push({
              time: new Date(dataValue.date),
              values: [...options.map(option => dataValue[option.internalKey])]
            })
            lowerMaxY = Math.max(lowerMaxY, ...options.map(option => dataValue[option.internalKey]))
          })
        }
        setSeriesValues([...newValues])
        setShowNoResult(false)
        setLowerMaxY(lowerMaxY)
      } else {
        setShowNoResult(true)
      }
    }
  }, [initialLoading])

  const generateLegend = () => {
    return (
      <div className={`${commonStyles.tinyFlexRow}`}>
        {
        options.map((option, i) => {
          return (
            <React.Fragment key={`label-${i}`}>
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                <div className={`${styles.label} ${typographyStyles.desktopBodySmallest} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}> {option.label} </div>
                <div className={`${styles.legendLine} ${colorStyles[`color-${i}`]}`} />
              </div>
              {options.length - 1 && i < (options.length - 1) ? <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} /> : ''}
            </React.Fragment>
          )
        })
      }
      </div>
    )
  }

  function renderComponent () {
    if (initialLoading) {
      return (
        <LoadingSpinnerV2
          loading
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: []
          }}
          containerClassName={loadingSpinnerStyles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (showNoResult) { return <NoDataAvailable iconName='NodeJSMetricsIcon' /> }

    return metricURL === 'latency'
      ? (
        <LatencyChart
          data={seriesValues}
          unit={unit}
          labels={options.map(option => ({ name: option.label, value: option.internalKey }))}
          percentiles={{
            p99: '#2192FA',
            p95: '#FA6221',
            p90: '#C61BE2'
          }}
          colorSet={metricURL}
          lowerMaxY={lowerMaxY}
          tooltipPosition={chartTooltipPosition}
        />
        )
      : (
        <NodeJSMetricChart
          data={seriesValues}
          unit={unit}
          labels={options.map(option => option.label)}
          colorSet={metricURL}
          lowerMaxY={lowerMaxY}
          tooltipPosition={chartTooltipPosition}
        />)
  }

  return (
    <BorderedBox classes={borderexBoxClassName} backgroundColor={backgroundColor} color={TRANSPARENT}>
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth} ${commonStyles.fullHeight}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${commonStyles.fullWidth} ${commonStyles.positionRelative}`}>
          <div className={`${commonStyles.tinyFlexRow}`}>
            <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{title}</span>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{unit}</span>
          </div>
          {!showNoResult && generateLegend()}
        </div>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${commonStyles.itemsCenter} ${commonStyles.fullHeight}`}>
          {renderComponent()}
        </div>
      </div>
    </BorderedBox>
  )
}

NodeJSMetric.propTypes = {
  /**
   * title
    */
  title: PropTypes.string,
  /**
   * metricURL
    */
  metricURL: PropTypes.string,
  /**
   * unit
    */
  unit: PropTypes.string,
  /**
   * data
    */
  data: PropTypes.object,
  /**
   * initialLoading
    */
  initialLoading: PropTypes.bool,
  /**
   * options
    */
  options: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    key: PropTypes.string,
    unit: PropTypes.string
  })),
  /**
   * backgroundColor
    */
  backgroundColor: PropTypes.oneOf([BLACK_RUSSIAN, RICH_BLACK]),
  /**
   * chartTooltipPositionPropTypes
  */
  chartTooltipPosition: PropTypes.oneOf([POSITION_ABSOLUTE, POSITION_FIXED])
}

export default NodeJSMetric
