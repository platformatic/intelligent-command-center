import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import PropTypes from 'prop-types'
import { getFormattedTimeAndDate } from '../../../utilities/dates'
import styles from './HistoryChart.module.css'

function capitalize (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}
export default function HistoryChart ({
  data = [],
  yValues = [],
  mouseX = 0,
  lineColor = '#4a90e2',
  onMouseMove = (mouseX) => {},
  onMouseLeave = () => {},
  percent = true,
  label = false,
  getDataAtIndex = (index) => {},
  size = 'large'
}) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const tooltipRef = useRef(null)
  const [chartWidth, setChartWidth] = useState(0)
  const [chartHeight, setChartHeight] = useState(0)

  if (!yValues.length) {
    yValues = [{
      value: 0,
      label: '0%',
      dashed: false
    }, {
      value: 50,
      label: '50%',
      dashed: false
    }, {
      value: 100,
      label: '100%',
      dashed: false
    }]
  }

  if (size === 'small') {
    data = data.slice(0, 5)
  }
  const chartData = data.map((value, index) => ({ x: index, y: value }))

  // Update chart dimensions when container resizes
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setChartWidth(rect.width)
      setChartHeight(rect.height)
    }

    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setChartWidth(rect.width)
        setChartHeight(rect.height)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!svgRef.current || !chartWidth || !chartHeight || !tooltipRef.current) return

    // Clear any existing chart
    d3.select(svgRef.current).selectAll('*').remove()

    // Setup dimensions
    let margin = { top: 10, right: 0, bottom: 10, left: 40 }
    if (size === 'small') {
      margin = { top: 0, right: 0, bottom: 0, left: 0 }
    }
    const width = chartWidth - margin.left - margin.right
    const height = chartHeight - margin.top - margin.bottom

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .attr('viewBox', [0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom])
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Setup tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style('position', 'absolute')
      .style('background-color', 'rgba(255, 255, 255, 0.9)')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
      .style('font-size', '12px')
      .style('color', 'black')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('transition', 'opacity 0.2s')
      .style('z-index', '1000')

    // Setup scales
    const x = d3.scaleLinear()
      .domain([0, chartData.length - 1])
      .range([0, width])

    const y = d3.scaleLinear()
      .domain(percent ? [0, 100] : [yValues[0].value, yValues[yValues.length - 1].value])
      .range([height, 0])

    // Create axes
    const xAxis = d3.axisBottom(x)
      .tickFormat(() => '')
    const yAxis = d3.axisLeft(y)
      .tickValues(yValues.map(value => value.value))
      .tickFormat(d => percent ? `${d} %` : d)

    // Add axes to the chart
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick > line').remove())

    svg.append('g')
      .call(yAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick > line').remove())
      .style('font-size', '12px')
      .style('text-color', 'white')
      .style('opacity', '0.5')

    // Add horizontal lines at 0%, 50%, and 100%
    yValues.forEach(value => {
      svg.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(value.value))
        .attr('y2', y(value.value))
        .attr('stroke', '#ccc')
        .attr('stroke-width', 0.3)
        .attr('stroke-dasharray', value.dashed ? '8,8' : 'none')
    })

    // Create the line generator
    const line = d3.line()
      .x(d => x(d.x))
      .y(d => y(d.y))
      // .curve(d3.curveMonotoneX)

    // Create area generator for the fill
    const area = d3.area()
      .x(d => x(d.x))
      .y0(height)
      .y1(d => y(d.y))
      // .curve(d3.curveMonotoneX)

    // Draw the area fill
    svg.append('path')
      .datum(chartData)
      .attr('fill', lineColor)
      .attr('fill-opacity', 0.2)
      .attr('d', area)

    // Draw the line
    svg.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', 2)
      .attr('d', line)

    // Add dots for each data point
    // (leorossi): Uncomment to show dots
    // svg.selectAll('.dot')
    //   .data(chartData)
    //   .enter()
    //   .append('circle')
    //   .attr('class', 'dot')
    //   .attr('cx', d => x(d.x))
    //   .attr('cy', d => y(d.y))
    //   .attr('r', 4)
    //   .attr('fill', '#4a90e2')

    // Create cursor elements
    const mouseG = svg.append('g')
      .attr('class', 'mouse-over-effects')
      .style('opacity', 0)

    // Vertical line
    mouseG.append('line')
      .attr('class', 'mouse-line')
      .attr('y1', 0)
      .attr('y2', height)
      .style('stroke', '#888')
      .style('stroke-width', '1px')
      .style('stroke-dasharray', '3,3')

    // Circle that follows the line
    const mouseCircle = mouseG.append('circle')
      .attr('class', 'mouse-circle')
      .attr('r', 6)
      .attr('fill', lineColor)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)

    if (mouseX > 0) {
      drawCursorLine(mouseX)
    }
    // Transparent overlay to handle mouse events
    mouseG.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseenter', () => {
        mouseG.style('opacity', 1)
        tooltip.style('opacity', 1)
      })
      .on('mouseleave', () => {
        mouseG.style('opacity', 0)
        tooltip.style('opacity', 0)
        onMouseLeave()
      })
      .on('mousemove', function (event) {
        const [mouseX] = d3.pointer(event, this)
        onMouseMove(mouseX)
        // Find the closest data point
        const xValue = x.invert(mouseX)
        const bisect = d3.bisector(d => d.x).left
        const index = bisect(chartData, xValue)
        const d0 = chartData[Math.max(0, index - 1)]
        const d1 = chartData[Math.min(chartData.length - 1, index)]

        // Find the closest point
        const point = xValue - d0.x > d1.x - xValue ? d1 : d0

        // Position the vertical line
        mouseG.select('.mouse-line')
          .attr('x1', x(point.x))
          .attr('x2', x(point.x))

        // Position the circle
        mouseCircle
          .attr('cx', x(point.x))
          .attr('cy', y(point.y))
        const dataAtIndex = getDataAtIndex(point.x)
        const htmlValues = Object.entries(dataAtIndex).map(([key, value]) => {
          if (key !== 'createdAt') {
            return `${capitalize(key)}: ${value}`
          }
          return ''
        }).join('<br>')
        const html = `${getFormattedTimeAndDate(dataAtIndex.createdAt)}<hr><div class="tooltip-values">${htmlValues}</div>`
        // Update tooltip content
        tooltip
          .html(html)
          .style('left', `${x(point.x) - 100}px`)
          .style('top', `${y(point.y) - 100}px`)
        // .style('left', `${event.offsetX - 100}px`)
        // .style('top', `${event.offsetY - 50}px`)
      })

    function drawCursorLine (mouseX) {
      // Find the closest data point
      const xValue = x.invert(mouseX)
      const bisect = d3.bisector(d => d.x).left
      const index = bisect(chartData, xValue)
      const d0 = chartData[Math.max(0, index - 1)]
      const d1 = chartData[Math.min(chartData.length - 1, index)]

      // Find the closest point
      const point = xValue - d0.x > d1.x - xValue ? d1 : d0

      mouseG.style('opacity', 1)
      // Position the vertical line
      mouseG.select('.mouse-line')
        .attr('x1', x(point.x))
        .attr('x2', x(point.x))

      // Position the circle
      mouseCircle
        .attr('cx', x(point.x))
        .attr('cy', y(point.y))
    }
  }, [chartData, chartWidth, chartHeight])

  const svgStyle = {
    width: '100%',
    height: size === 'small' ? '120px' : '100%',
    display: 'block'
  }
  return (
    <div className={styles.historyChart}>
      {label && <h2>{label}</h2>}
      <div ref={containerRef} style={{ width: '100%', height: size === 'small' ? '120px' : '100%', position: 'relative' }}>
        <svg ref={svgRef} style={svgStyle} preserveAspectRatio='xMidYMid meet' />
        <div ref={tooltipRef} className='tooltip' />
      </div>
    </div>
  )
}

HistoryChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.number),
  yValues: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
    dashed: PropTypes.bool
  })),
  mouseX: PropTypes.number,
  lineColor: PropTypes.string,
  onMouseMove: PropTypes.func,
  onMouseLeave: PropTypes.func
}
