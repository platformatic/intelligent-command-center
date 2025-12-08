import { useEffect, useRef, useState } from 'react'
import styles from './charts.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import * as d3 from 'd3'
import colorSetMem from './memory.module.css'
import colorSetCpu from './cpu.module.css'
import { xMargin, yMargin, windowInMinutes } from './chart_constants.js'
import { findY } from './chart_utils.js'
import { VerticalSeparator } from '@platformatic/ui-components'
import { OPACITY_30, WHITE } from '@platformatic/ui-components/src/components/constants.js'
import { getTicks } from './utils.js'

const LineChart = ({
  data,
  title,
  unit,
  labels,
  colorSet = 'mem',
  paused = false,
  setPaused = () => {},
  lowerMaxY = 10, // y max is dynamic, but we migth want to have a max lower bound. Set to 0 for completely dynamic y max
  yMin = 0
}) => {
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)

  const colorStyles = colorSet === 'mem' ? colorSetMem : colorSetCpu
  const numberOfLines = labels.length

  // We assume the data is an array of objects with a time and a value
  // The setter is missing on purpose. We don't want to trigger a rerender when the mouse position changes
  const [mousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (svgRef.current && tooltipRef.current && !paused && data.length > 0) {
      const h = svgRef.current.clientHeight
      const w = svgRef.current.clientWidth

      const svg = d3
        .select(svgRef.current)

      const tooltip = d3
        .select(tooltipRef.current)

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
      const maxy = d3.max([d3.max(allCurrentValues), lowerMaxY])
      const yMax = maxy + (maxy * 0.10) // We add 10% to the max to have some space on top
      y.domain([yMin, yMax])

      // We always show 10 labels on the x axis
      const labelSecondsInterval = windowInMinutes * 60 / 10
      const yAxisTickValues = [...getTicks(yMin, maxy, 2, false)]

      const xAxis = d3
        .axisBottom()
        .scale(x)
        .tickFormat(d3.timeFormat('%H:%M:%S'))
        .ticks(d3.timeSecond.every(labelSecondsInterval))

      d3
        .axisLeft()
        .scale(y)
        .tickValues(yAxisTickValues)
        .tickPadding(10)

      svg.attr('width', w)
        .attr('height', h)
        .append('g')
        .attr('transform', `translate(${xMargin}, ${xMargin})`)

      const $xAxis = svg
        .append('g')
        .attr('transform', `translate(0, ${h - yMargin})`)

      svg.append('g')
        .attr('class', styles.grid)
        .call(d3
          .axisLeft(y)
          .tickValues(yAxisTickValues)
          .tickSize(-(w - (xMargin * 2)))
          .tickFormat((d) => {
            if (d > 1024 && unit === 'MB') {
              return d3.format('.0f')(d / 1024) + ' GB'
            }
            return d3.format('.0f')(d)
          })
        )
        .attr('transform', `translate(${xMargin})`)
        .attr('class', styles.axis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick > line').remove())

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
          .attr('class', `${styles.line} ${colorStyles[`color-${i}`]}`)
          .datum(latestData)
          .attr('d', d3.line()
            .x(p => {
              return x(p.time)
            })
            .y((p) => y(p.values[i]))
            .curve(d3.curveBasis)
          )
          .node())

        tooltipDots.push(svg
          .append('circle')
          .attr('r', 5)
          .attr('class', colorStyles[`color-${i}`])
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
          if (xPos < xMargin) {
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
        const timeString = d3.timeFormat('%H:%M:%S.%L %p')(data.time)

        const valuesData = data.values.map((v, i) => {
          return {
            label: labels[i],
            value: Math.round(v * 100) / 100,
            colorSeparator: colorStyles[`background-color-${i}`]
          }
        })

        tooltip.html(`
        <div ${styles.tooltipContainer}>
          <div class="${styles.tooltipTime}">
            <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack}">${timeString}</div>
          </div>
          <div class="${styles.tooltipTable}">
            ${valuesData.map(v => {
              return `
                <div class="${styles.tooltipLine}">
                  <div class="${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}">  
                    <hr class="${styles.verticalSeparatorTooltip} ${v.colorSeparator}" />
                    <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack}">${v.label}</div>
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

        const maxY = y(d3.max(data.values))
        const tooltipWidth = 160
        const tooltipHeight = 60 + (valuesData.length * 15)
        const tx = xPos + tooltipWidth < w ? xPos : w - tooltipWidth
        // Ensure tooltip doesn't go above the chart container
        const ty = Math.max(10, maxY - tooltipHeight)
        tooltip.style('left', tx + 'px').style('top', ty + 'px')
        if (xPos < xMargin || xPos > (w - xMargin)) {
          tooltip.style('opacity', 0)
          hideCircles()
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
  }, [svgRef.current, tooltipRef.current, paused])

  const generateLegend = (labels) => {
    return (
      <div className={styles.labels}>
        {
        labels.map((label, i) => {
          return (
            <div key={`label-${i}`} className={styles.labelContainer}>
              <div className={`${styles.label} ${typographyStyles.desktopBodySmallest} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>{label} </div>
              <div className={`${styles.legendLine} ${colorStyles[`color-${i}`]}`} />
              <div>{i !== labels.length - 1 ? <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} /> : ''}</div>
            </div>
          )
        })
      }
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{title}</span> <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70}`}>({unit})</span>
        </div>
        <div className={styles.labels}>
          {
            generateLegend(labels)
          }
        </div>
      </div>
      <svg
        ref={svgRef} style={{ width: '100%', height: '96px' }}
        onClick={
          () => {
            if (paused) {
              tooltipRef.current.style.opacity = 0
            }
            setPaused(!paused)
          }
        }
      />
      <div ref={tooltipRef} className={styles.tooltip} />
    </div>

  )
}

export default LineChart
