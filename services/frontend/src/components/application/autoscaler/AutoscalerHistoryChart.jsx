import * as d3 from 'd3'
import PropTypes from 'prop-types'
import React, { useEffect, useRef, useState } from 'react'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './AutoscalerHistoryChart.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { xMargin, yMargin } from '~/components/metrics/chart_constants.js'
import { POSITION_ABSOLUTE, POSITION_FIXED } from '~/ui-constants'

const AutoscalerHistoryChart = ({
  data,
  maxNumberOfPods = 10,
  tooltipPosition = POSITION_ABSOLUTE
}) => {
  const svgRef = useRef()
  const tooltipRef = useRef()
  // We assume the data is an array of objects with a time and a value
  // The setter is missing on purpose. We don't want to trigger a rerender when the mouse position changes
  const [mousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (svgRef.current && tooltipRef.current && data.length > 0) {
      const width = svgRef.current.clientWidth
      const height = svgRef.current.clientHeight
      const tooltip = d3
        .select(tooltipRef.current)

      const svg = d3.select(svgRef.current)
      svg.selectAll('*').remove() // clean up the svg

      svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${xMargin}, ${yMargin})`)

      // Get max value from values[1] and create evenly distributed ticks
      const maxValue = Math.max(...data.map(d => d.values[1] || 0))
      // Round up to next even integer
      const nextEvenMax = Math.ceil(maxValue / 2) * 2
      // Create evenly distributed tick values with equal intervals
      const interval = nextEvenMax / 3 // Divide the range into 3 equal parts
      const yAxisTickValues = nextEvenMax > 0
        ? [0, interval, interval * 2, nextEvenMax]
        : [0, 1, 2, 3] // fallback values if maxValue is 0 or invalid

      // Y Axis
      const y = d3.scaleLinear([0, nextEvenMax || 1], [height - 2 * yMargin, 0])
      const yAxis = d3.axisLeft(y)
        .tickValues(yAxisTickValues)
        .tickFormat(d => Math.round(Number(d)).toString())

      svg
        .append('g')
        .attr('transform', `translate(${xMargin}, ${yMargin})`)
        .call(yAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick > line').remove())
        .attr('class', styles.axis)

      // X Axis
      const timeExtent = [data[0].time, data[data.length - 1].time]
      const timePadding = (timeExtent[1] - timeExtent[0]) * 0.05 // 5% padding
      const x = d3.scaleTime()
        .domain([timeExtent[0], new Date(timeExtent[1].getTime() + timePadding)])
        .range([0, width - 2 * xMargin - 20]) // For axis labels

      const xData = d3.scaleTime()
        .domain([timeExtent[0], new Date(timeExtent[1].getTime() + timePadding)])
        .range([0, width - 2 * xMargin]) // For data visualization

      const xAxis = d3.axisBottom(x)
        .tickFormat(d3.timeFormat('%H:%M:%S'))
        .ticks(4)

      svg
        .append('g')
        .attr('transform', `translate(${xMargin}, ${height - yMargin})`)
        .call(xAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick > line').remove())
        .style('opacity', '0.7')
        .attr('class', styles.axis)

      // Grid lines
      svg.append('g')
        .attr('class', styles.grid)
        .attr('transform', `translate(${xMargin}, ${yMargin})`)
        .call(d3.axisLeft(y)
          .tickValues(yAxisTickValues)
          .tickSize(-(width - 2 * xMargin))
          .tickFormat('')
        )
        .call(g => g.select('.domain').remove())

      // Create the line generator
      const line = d3.line()
        .x(d => xData(d.time))
        .y(d => y(d.values[1]))
        .curve(d3.curveStepAfter)

      // Draw the line
      svg.append('g')
        .attr('transform', `translate(${xMargin}, ${yMargin})`)
        .append('path')
        .datum(data)
        .attr('class', styles.line)
        .attr('fill', 'none')
        .attr('d', line)

      // Draw the area fill
      const area = d3.area()
        .x(d => xData(d.time))
        .y0(height - 2 * yMargin)
        .y1(d => y(d.values[1]))
        .curve(d3.curveStepAfter)

      svg.append('g')
        .attr('transform', `translate(${xMargin}, ${yMargin})`)
        .append('path')
        .datum(data)
        .attr('class', styles.pathFill)
        .attr('d', area)

      // Create a line and a fill SVG paths
      // to fill the area right of the
      const lastEvent = data[data.length - 1]
      const finishPath = `M${x(lastEvent.time) + xMargin + 19},${yMargin} h ${xMargin}`
      const finishFill = finishPath + `V ${height - yMargin} h -${xMargin} Z`
      // Append the top line
      svg.append('path')
        .attr('class', styles.line)
        .attr('d', finishPath)

      // append the semi-transparent fill
      svg.append('path')
        .attr('class', styles.pathFill)
        .attr('d', finishFill)

      // Focus object for tooltip
      const focus = svg.append('g')
        .attr('class', styles.tooltip)

      focus.append('circle')
        .attr('class', styles['tooltip-point'])
        .attr('r', 4)

      svg.on('mouseover pointermove', showCircles)
        .on('pointerleave', hideCircles)

      showCircles()

      function showCircles (event) {
        let xPos, yPos
        if (event) {
          [xPos, yPos] = d3.pointer(event)
          mousePosition.x = xPos
          mousePosition.y = yPos
        } else {
          if (mousePosition.x === 0 && mousePosition.y === 0) {
            focus.style('opacity', 0)
            return
          }
          xPos = mousePosition.x
          yPos = mousePosition.y
        }

        // Get the time value at the current x position
        const x0 = x.invert(xPos - xMargin)
        const i = d3.bisect(data.map(d => d.time), x0)
        const d0 = data[i - 1] || data[0]

        // Hide the circle if outside the chart
        if (xPos < xMargin || xPos > width - xMargin) {
          focus.style('opacity', 0)
          return
        }
        focus.style('opacity', 1)
        focus.select(`circle.${styles['tooltip-point']}`)
          .attr('transform', `translate(${xPos},${y(d0.values[1]) + yMargin})`)

        // Prepare the tooltip
        const timeString = d3.timeFormat('%H:%M:%S.%L %p')(x0)
        const valuesData = [{
          label: 'Scaled from:',
          value: d0.values[0]
        }, {
          label: 'Scaled to:',
          value: d0.values[1]
        }]

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
                      <span class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack} ${typographyStyles.opacity70}">${v.label}</span>
                      <span class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack}">${v.value}</span>
                    </div>
                  </div>
              `
              }).join('')}
            </div>
          </div>`)

        const tooltipWidth = 160
        const tx = xPos + (tooltipWidth * 1 / 4) < width ? xPos - (tooltipWidth * 1 / 4) : width - (tooltipWidth / 2)
        const ty = y(d0.values[1]) + yMargin - 50
        tooltip.style('left', tx + 'px').style('top', ty + 'px')
        if (xPos < xMargin) {
          tooltip.style('opacity', 0)
        } else {
          tooltip.style('opacity', 0.9)
        }
      }

      function hideCircles () {
        focus.style('opacity', 0)
        mousePosition.x = 0
        mousePosition.y = 0
        tooltip.style('opacity', 0)
      }
    }
  }, [svgRef, tooltipRef, data])

  return (
    <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter} ${commonStyles.itemsCenter}`}>
      <svg ref={svgRef} style={{ width: '100%', height: '113px', overflowX: 'scroll' }} />
      <div ref={tooltipRef} className={`${tooltipPosition === POSITION_ABSOLUTE ? styles.tooltipAbsolute : styles.tooltipFixed} ${styles.tooltip}`} />
    </div>
  )
}

AutoscalerHistoryChart.propTypes = {
  /**
   * data
   */
  data: PropTypes.array,
  /**
   * maxNumberOfPods
  */
  maxNumberOfPods: PropTypes.number,
  /**
   * tooltipPosition
  */
  tooltipPosition: PropTypes.oneOf([POSITION_ABSOLUTE, POSITION_FIXED])
}

export default AutoscalerHistoryChart
