import React, { useEffect, useRef, useState } from 'react'
import styles from './HistoricalScalerTrendChart.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import * as d3 from 'd3'
import { xMargin, yMargin } from '~/components/metrics/chart_constants.js'
import { findY } from '~/components/metrics/chart_utils.js'
import { getTicks } from '~/components/metrics/utils.js'
import { findNextNumberDivisibleBy } from '../../../metrics/utils'
import dayjs from 'dayjs'

const HistoricalScalerTrendChart = ({
  data,
  labels,
  lowerMaxY = 10,
  yMin = 0
}) => {
  const svgRef = useRef()
  const tooltipRef = useRef()
  const numberOfLines = labels.length

  // We assume the data is an array of objects with a time and a value
  // The setter is missing on purpose. We don't want to trigger a rerender when the mouse position changes
  const [mousePosition] = useState({ x: 0, y: 0 })
  useEffect(() => {
    if (svgRef.current && tooltipRef.current && data.length > 0) {
      // Add a last point to the data to make the chart more clear
      // and see the last point of the chart with the tooltip
      const augmentedData = data.map(d => ({
        time: dayjs(d.time).add(30, 'seconds').toDate(), // TODO: remove this after seed data is removed
        values: d.values
      }))
      const lastPoint = data[data.length - 1]
      augmentedData.push({
        time: dayjs(lastPoint.time).add(30, 'seconds').toDate(),
        values: lastPoint.values
      })

      const h = svgRef.current.clientHeight - 1 // -1 to avoid the border of the svg
      const w = svgRef.current.clientWidth
      const Y_AXIS_BANDS = 4
      const svg = d3
        .select(svgRef.current)

      const tooltip = d3
        .select(tooltipRef.current)

      svg.selectAll('*').remove() // clean up the svg
      const y = d3.scaleLinear([h - yMargin, 0])
      const x = d3.scaleTime([xMargin, w - xMargin])

      // We need to slice it here otherwise we cannot pause / resume the chart scrolling
      const latestData = augmentedData.toReversed()
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
      // const maxy = d3.min([d3.max(allCurrentValues), lowerMaxY])
      const maxy = findNextNumberDivisibleBy(d3.max(allCurrentValues), Y_AXIS_BANDS)

      const yMax = maxy + (maxy * 0.1) // We add 5% to the max to have some space on top
      y.domain([yMin, yMax])
      const yAxisTickValues = [...getTicks(yMin, maxy, Y_AXIS_BANDS, false)]
      const xAxis = d3
        .axisBottom()
        .scale(x)
        .tickFormat(d3.utcFormat('%H:%M:%S'))

      const yAxis = d3
        .axisLeft()
        .scale(y)
        .tickValues(yAxisTickValues)
        .tickFormat(d3.format('.0f'))

      svg.attr('width', w)
        .attr('height', h)
        .append('g')
        .attr('transform', `translate(${xMargin}, ${xMargin})`)

      const $xAxis = svg
        .append('g')
        .attr('transform', `translate(0, ${h - yMargin})`)

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
      $xAxis
        .call(xAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick > line').remove())
        .attr('class', styles.axis)

      svg
        .selectAll('rect')
        .join('rect')
      const paths = []
      const tooltipDots = []
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

        tooltipDots.push(svg
          .append('circle')
          .attr('r', 5)
          .attr('class', styles[`color-${i}`])
          .attr('stroke', 'black')
          .attr('stroke-width', 2)
          .style('opacity', 0)
          .style('pointer-events', 'none')
        )
      }
      svg.on('mouseover pointermove', showCircles)
        .on('pointerleave', hideCircles)

      // When we re-render the chart, we need to show the circles again
      // (otherwise they disappear when the chart is re-rendered)
      showCircles()

      function showCircles (event) {
        let xPos, yPos
        if (event) {
          [xPos, yPos] = d3.pointer(event)
          mousePosition.x = xPos
          mousePosition.y = yPos
        } else {
          if (mousePosition.x === 0 && mousePosition.y === 0) {
            return
          }
          xPos = mousePosition.x
          yPos = mousePosition.y
        }

        const time = (x.invert(xPos)).getTime()
        const closestIndex = d3.bisect(latestData.map(d => d.time), time)
        const data = latestData[closestIndex - 1] || latestData[0]
        if (!data) {
          return
        }

        for (let i = 0; i < numberOfLines; i++) {
          const path = paths[i]
          if (xPos < xMargin || xPos > (w - xMargin)) {
            tooltipDots[i].style('opacity', 0)
            continue
          }
          tooltipDots[i]
            .style('opacity', 1)
            .attr('cx', xPos)
            .attr('cy', findY(path, path.getTotalLength(), xPos, w))
            .raise()
        }

        // Prepare the tooltip
        const timeString = d3.utcFormat('%H:%M:%S.%L %p')(data.time)

        const valuesData = data.values.map((v, i) => {
          return {
            label: labels[i],
            value: v
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
                  <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack}">${v.label}</div>
                  <div class="${styles.tooltipValueContainer}">
                    <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack} ${styles.tooltipValue}">${v.value}</div>
                  </div>
                </div>
            `
            }).join('')}
          </div>
        </div>`)

        const maxY = y(d3.max(data.values))
        const tooltipWidth = 160
        const tooltipHeight = 60 + (valuesData.length * 15)
        const tx = xPos + tooltipWidth < w ? xPos : w - tooltipWidth
        const ty = maxY - tooltipHeight
        tooltip.style('left', tx + 'px').style('top', ty + 'px')
        if (xPos < xMargin) {
          tooltip.style('opacity', 0)
        } else {
          tooltip.style('opacity', 0.9)
        }
      }

      function hideCircles () {
        tooltipDots.forEach(t => t.style('opacity', 0))
        mousePosition.x = 0
        mousePosition.y = 0
        tooltip.style('opacity', 0)
      }
    }
  }, [svgRef, tooltipRef, data])

  return (
    <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
      <svg
        ref={svgRef} style={{ width: '100%', height: '174px' }}
      />
      <div ref={tooltipRef} className={styles.tooltip} />
    </div>
  )
}

export default HistoricalScalerTrendChart
