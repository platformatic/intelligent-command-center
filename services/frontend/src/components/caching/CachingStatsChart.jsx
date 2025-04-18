import React, { useEffect, useRef } from 'react'
import styles from './CachingStatsChart.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import * as d3 from 'd3'
import { getTicks } from '~/components/metrics/utils.js'
import { findNextNumberDivisibleBy } from '../metrics/utils'

const xMargin = 20
const yMargin = 5

const CachingStatsChart = ({
  title,
  data,
  labels,
  yMin = 0
}) => {
  const svgRef = useRef()
  const numberOfLines = labels.length

  useEffect(() => {
    if (svgRef.current && data.length > 0) {
      const h = svgRef.current.clientHeight
      const w = svgRef.current.clientWidth
      const Y_AXIS_BANDS = 2
      const svg = d3.select(svgRef.current)

      svg.selectAll('*').remove() // clean up the svg
      const y = d3.scaleLinear([h - yMargin, 0])
      const x = d3.scaleTime([xMargin, w - xMargin])

      // We need to slice it here otherwise we cannot pause / resume the chart scrolling
      const latestData = data
      const firstDatum = latestData[0]
      const lastDatum = latestData[latestData.length - 1]
      const firstTime = firstDatum.time // This is the time of the first data point in the window
      const lastTime = lastDatum.time // This is the time of the last data point in the window
      x.domain([firstTime, lastTime])

      // We need to get the max y for all values to correctly set the y domain`
      const allCurrentValues = []
      for (let i = 0; i < latestData.length; i++) {
        allCurrentValues.push(...latestData[i].values)
      }
      const maxy = findNextNumberDivisibleBy(d3.max(allCurrentValues), Y_AXIS_BANDS)

      const yMax = maxy + (maxy * 0.1) // We add 5% to the max to have some space on top
      y.domain([yMin, yMax])
      const yAxisTickValues = [...getTicks(yMin, maxy, Y_AXIS_BANDS, false)]

      const yAxis = d3
        .axisLeft()
        .scale(y)
        .tickValues(yAxisTickValues)
        .tickFormat(d3.format('.0f'))

      svg.attr('width', w)
        .attr('height', h)
        .append('g')
        .attr('transform', `translate(${xMargin}, ${xMargin})`)

      const $yAxis = svg
        .append('g')
        .attr('transform', `translate(${xMargin})`)

      svg.append('g')
        .attr('class', styles.grid)
        .call(d3.axisLeft(y)
          .tickValues(yAxisTickValues)
          .tickSize(-(w - (xMargin * 2)))
          .tickFormat(''))
        .attr('transform', `translate(${xMargin})`)
        .call(g => g.select('.domain').remove())

      $yAxis
        .call(yAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick > line').remove())
        .attr('class', styles.axis)

      svg
        .selectAll('rect')
        .join('rect')
      const paths = []
      for (let i = 0; i < numberOfLines; i++) {
        paths.push(svg
          .append('path')
          .attr('class', `${styles.line} ${styles[`color-${i}`]}`)
          .datum(latestData)
          .attr('d', d3.line()
            .x(p => {
              return x(p.time)
            })
            .y((p) => y(p.values[i]))
          )
          .node())
      }
    }
  }, [svgRef, data])

  return (
    <div className={`${commonStyles.fullWidth} `}>
      <div className={styles.chartLegend}>
        <div className={styles.chartTitle}>
          <div>{title}</div>
          <div className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Last 15 minutes data</div>
        </div>
        <div className={`${styles.chartLegend}`}>
          <div className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Hits</div>
          <div className={`${styles.legendLine} ${styles['color-1']}`} />
          <div className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity30}`}>|</div>
          <div className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Misses</div>
          <div className={`${styles.legendLine} ${styles['color-0']}`} />
        </div>
      </div>
      <div>
        <svg ref={svgRef} style={{ width: '100%', height: '80px' }} />
      </div>
    </div>
  )
}

export default CachingStatsChart
