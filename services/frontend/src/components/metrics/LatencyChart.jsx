import React, { useRef, useState, useEffect } from 'react'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './LatencyChart.module.css'
import * as d3 from 'd3'
import { xMargin, yMarginWithoutXAxis } from './chart_constants.js'
import colorSetLatency from './latency.module.css'
import { getTicks } from './utils.js'
import { POSITION_ABSOLUTE, POSITION_FIXED } from '~/ui-constants'

const LatencyChart = ({
  data,
  unit,
  labels = [],
  percentiles = {},
  keyForCheckMax = 'p99',
  tooltipPosition = POSITION_ABSOLUTE
}) => {
  const yMin = 0
  const lowerMaxY = 10 // y max is dynamic, but we migth want to have a max lower bound. Set to 0 for completely dynamic y max

  // The setter is missing on purpose. We don't want to trigger a rerender when the mouse position changes
  const [mousePosition] = useState({ x: 0, y: 0 })
  const svgRef = useRef()
  const tooltipRef = useRef()

  useEffect(() => {
    if (svgRef.current && tooltipRef.current && data.length > 0) {
      const h = svgRef.current.clientHeight
      const w = svgRef.current.clientWidth

      const svg = d3
        .select(svgRef.current)

      const tooltip = d3
        .select(tooltipRef.current)

      svg.selectAll('*').remove() // clean up the svg
      const y = d3.scaleLinear([h - yMarginWithoutXAxis, 0])
      const x = d3.scaleTime([xMargin, w])

      // We need to slice it here otherwise we cannot pause / resume the chart scrolling
      const latestData = data
      const firstDatum = latestData[0]
      const lastDatum = latestData[latestData.length - 1]
      const firstTime = firstDatum.time // This is the time of the first data point in the window
      const lastTime = lastDatum.time // This is the time of the last data point in the window
      x.domain([firstTime, lastTime])

      latestData.shift() // We remove the first element because the bar cover the y axis

      // We need to get the max y for all values to correctly set the y domain
      const allCurrentValues = [100]
      for (let i = 0; i < latestData.length; i++) {
        if (latestData[i][keyForCheckMax] !== null) {
          allCurrentValues.push(latestData[i][keyForCheckMax])
        }
      }
      const maxy = d3.max([d3.max(allCurrentValues), lowerMaxY])
      const yMax = maxy + (maxy * 0.1) // We add 10% to the max to have some space on top

      y.domain([yMin, yMax])
      const yAxisTickValues = [...getTicks(yMin, maxy, 3, false)]
      // We always show 10 labels on the x axis
      // const labelSecondsInterval = windowInMinutes * 60 / 10

      const yAxis = d3.axisLeft().scale(y).tickValues(yAxisTickValues)
      svg.append('g')
        .attr('transform', `translate(${xMargin}, ${xMargin})`)
        .attr('viewBox', `0 0 ${w} ${h}`)

      const $yAxis = svg
        .append('g')
        .attr('transform', `translate(${xMargin})`)

      svg.append('g')
        .attr('class', styles.grid)
        .call(d3.axisLeft(y).tickValues(yAxisTickValues).tickSize(-w).tickFormat(''))
        .attr('transform', `translate(${xMargin})`)
        .call(g => g.select('.domain').remove())

      $yAxis
        .call(yAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick > line').remove())
        .attr('class', styles.axis)

      const chart = svg.selectAll('.chart')
        .data(latestData)
        .enter()

      const barWidth = 2
      const barOffset = -(barWidth * 2)

      Object.keys(percentiles).forEach(percentile => {
        chart.append('rect')
          .attr('fill', percentiles[percentile])
          .attr('x', d => x(d.time) + barOffset)
          .attr('y', d => y(d[percentile] || 0))
          .attr('width', barWidth)
          .attr('height', d => h - yMarginWithoutXAxis - y(d[percentile] || 0))
      })

      // Tooltip
      svg.on('mouseover pointermove', showTooltip)
        .on('pointerleave', hideTooltip)

      function showTooltip (event) {
        let xPos, yPos
        if (event) {
          [xPos, yPos] = d3.pointer(event)
          mousePosition.x = xPos
          mousePosition.y = yPos
        } else {
          if ((mousePosition.x === 0 && mousePosition.y === 0) || tooltipPosition === POSITION_FIXED) {
            return
          }
          xPos = mousePosition.x
          yPos = mousePosition.y
        }

        const time = (x.invert(xPos)).getTime()
        const data = latestData.find(d => d.time.getTime() >= time)
        if (!data) {
          return
        }

        // Prepare the tooltip
        const timeString = d3.timeFormat('%H:%M:%S.%L %p')(data.time)
        const valuesData = labels.map((label, i) => {
          return {
            name: label.name,
            value: Math.round((data[label.value] || 0) * 100) / 100,
            colorSeparator: colorSetLatency[`background-color-${i}`]
          }
        })

        tooltip.html(`
      <div ${styles.tooltipContainer}>
        <div class="${styles.tooltipTime}">
          <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack} ${styles.time}">${timeString}</div>
        </div>
        <div class="${styles.tooltipTable}">
          ${valuesData.map(v => {
            return `
              <div class="${styles.tooltipLine}">
                <div class="${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}">  
                  <hr class="${styles.verticalSeparatorTooltip} ${v.colorSeparator}" />
                  <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack}">${v.name}</div>
                </div>
                <div class="${styles.tooltipValueContainer}">
                  <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack} ${styles.tooltipValue}">${v.value}</div>
                  <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack} ${styles.tooltipUnit}">${unit}</div>
                </div>
              </div>
          `
          }).join('')}
        </div>
      </div>`)

        const maxY = y(data[keyForCheckMax])
        const tooltipWidth = 160
        const tooltipHeight = valuesData.length * 15
        let tx = xPos + tooltipWidth < w ? xPos : w - tooltipWidth
        let ty = maxY - (tooltipHeight + 30)
        if (tooltipPosition === POSITION_FIXED) {
          tx = event.clientX - (tooltipWidth / 2)
          ty = svgRef.current.getBoundingClientRect().bottom - svgRef.current.getBoundingClientRect().height - tooltipHeight - 75 + maxY
        }

        tooltip.style('left', tx + 'px').style('top', ty + 'px')
        if (xPos < xMargin) {
          tooltip.style('opacity', 0)
        } else {
          tooltip.style('opacity', 0.9)
        }
      }

      function hideTooltip () {
        mousePosition.x = 0
        mousePosition.y = 0
        tooltip.style('opacity', 0)
      }
    }
  }, [svgRef, tooltipRef, data])

  return (
    <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
      <svg
        ref={svgRef} style={{ width: '100%', height: '96px' }}
      />
      <div ref={tooltipRef} className={`${tooltipPosition === POSITION_ABSOLUTE ? styles.tooltipAbsolute : styles.tooltipFixed} ${styles.tooltip}`} />
    </div>
  )
}

export default LatencyChart
