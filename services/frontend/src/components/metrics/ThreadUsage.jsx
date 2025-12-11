'use strict'

import React, { useEffect, useRef, useState } from 'react'

import styles from './ThreadUsage.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import * as d3 from 'd3'
import { xMargin, yMargin } from './chart_constants.js'
import { DEFAULT_HEIGHT_CHART } from '~/ui-constants'
import NoDataFound from '~/components/ui/NoDataFound'
import { REFRESH_INTERVAL_METRICS } from '../../ui-constants.js'
import useRefreshData from '~/hooks/useRefreshData'
import callApi from '~/api/common'
import { convertThreadsToArray } from './utils'

const ThreadUsage = ({
  data = [],
  applicationId,
  serviceId,
  heightChart = DEFAULT_HEIGHT_CHART
}) => {
  const [currentData, setCurrentData] = useState(data)
  const [latestApplicationState, setLatestApplicationState] = useState(null)
  const [minMax, setMinMax] = useState({ min: 1, max: 1 })
  const svgRef = useRef()

  useEffect(() => {
    if (latestApplicationState) {
      const serviceState = latestApplicationState.state?.services.find((s) => s.id === serviceId)
      setMinMax({
        min: serviceState?.minWorkers,
        max: serviceState?.maxWorkers
      })
    }
  }, [latestApplicationState])

  useEffect(() => {
    getLatestApplicationState().then(setLatestApplicationState)
  }, [data])

  async function getLatestApplicationState () {
    const searchParams = new URLSearchParams()
    searchParams.append('orderby.createdAt', 'desc')
    searchParams.append('limit', '1')
    searchParams.append('where.applicationId.eq', applicationId)
    const data = await callApi('control-plane', `/applicationStates?${searchParams.toString()}`, 'GET')
    return data[0]
  }
  useRefreshData(REFRESH_INTERVAL_METRICS, loadData)
  async function loadData () {
    const applicationThreads = await callApi('metrics', `apps/${applicationId}/threads?serviceId=${serviceId}`, 'GET')
    const serviceThreads = convertThreadsToArray(applicationThreads, serviceId)
    setCurrentData(serviceThreads)
  }
  useEffect(() => {
    if (!svgRef.current || currentData.length === 0) return

    const h = svgRef.current.clientHeight - 1 // -1 to avoid the border of the svg
    const w = svgRef.current.clientWidth

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Remove any existing tooltips
    d3.select(svgRef.current.parentNode).selectAll('.tooltip').remove()

    const topMargin = 30
    const y = d3.scaleLinear([h - yMargin, topMargin])
    const leftMargin = xMargin + 20
    const rightMargin = 10
    const x = d3.scaleBand().range([leftMargin, w - rightMargin]).padding(0.2)

    const podIds = currentData.map(d => Object.keys(d)[0])
    const threadCounts = currentData.map(d => Object.values(d)[0])

    const yMin = 0
    const yMax = minMax.max !== undefined ? minMax.max : d3.max(threadCounts)

    y.domain([yMin, yMax])
    x.domain(podIds)

    const MAX_PODS_WITH_FIXED_WIDTH = 8
    // Calculate bar width - use fixed width for fewer than 5 pods
    const chartWidth = w - leftMargin - rightMargin
    const barWidth = podIds.length < MAX_PODS_WITH_FIXED_WIDTH ? chartWidth / MAX_PODS_WITH_FIXED_WIDTH : x.bandwidth()

    svg.attr('width', w)
      .attr('height', h)

    // Draw base x-axis line at y=0
    svg.append('line')
      .attr('x1', leftMargin)
      .attr('x2', w - rightMargin)
      .attr('y1', y(0))
      .attr('y2', y(0))
      .attr('stroke', '#4D5054')
      .attr('stroke-width', 1)

    // Add "0" label at the base line
    svg.append('text')
      .attr('x', leftMargin - 5)
      .attr('y', y(0) + 4)
      .attr('text-anchor', 'end')
      .attr('fill', '#4D5054')
      .attr('font-size', '12px')
      .text('0')

    // Create tooltip div
    const tooltip = d3.select(svgRef.current.parentNode)
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('color', 'black')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000)
      .style('white-space', 'nowrap')
      .style('max-width', '200px')
      .style('overflow', 'hidden')
      .style('text-overflow', 'ellipsis')

    svg.selectAll('.bar')
      .data(currentData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(Object.keys(d)[0]))
      .attr('y', d => y(Object.values(d)[0]))
      .attr('width', barWidth)
      .attr('height', d => h - yMargin - y(Object.values(d)[0]))
      .attr('fill', '#0A1A2D')
      .attr('stroke', '#2588E4')
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        const podId = Object.keys(d)[0]
        const threadCount = Object.values(d)[0]

        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9)

        tooltip.html(getTooltipHTML(podId, threadCount))
          .style('left', (event.layerX + 5) + 'px')
          .style('top', (event.layerY + 5) + 'px')
      })
      .on('mouseout', function () {
        tooltip.transition()
          .duration(200)
          .style('opacity', 0)
      })

    function getTooltipHTML (podId, threadCount) {
      let displayPodId = podId
      if (podId.length > 12) {
        const firstPart = podId.substring(0, 6)
        const lastPart = podId.substring(podId.length - 6)
        displayPodId = `${firstPart}...${lastPart}`
      }
      return `<div>Pod Id: ${displayPodId}<br/><span class="text-sm">Threads Used: ${threadCount}</span></div>`
    }

    // Handle min/max lines and labels
    if (minMax.min !== undefined && minMax.max !== undefined) {
      if (minMax.min === minMax.max) {
        // When min and max are equal, show only one line with combined label
        svg.append('line')
          .attr('x1', leftMargin)
          .attr('x2', w - rightMargin)
          .attr('y1', y(minMax.min))
          .attr('y2', y(minMax.min))
          .attr('stroke', '#4D5054')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,4')

        // Add multi-line label for combined min/max
        const textGroup = svg.append('g')
        textGroup.append('text')
          .attr('x', leftMargin - 5)
          .attr('y', y(minMax.min) - 2)
          .attr('text-anchor', 'end')
          .attr('fill', '#4D5054')
          .attr('font-size', '12px')
          .text(`Min ${minMax.min}`)
        textGroup.append('text')
          .attr('x', leftMargin - 5)
          .attr('y', y(minMax.min) + 10)
          .attr('text-anchor', 'end')
          .attr('fill', '#4D5054')
          .attr('font-size', '12px')
          .text(`Max ${minMax.max}`)
      } else {
        // When min and max are different, show separate lines
        svg.append('line')
          .attr('x1', leftMargin)
          .attr('x2', w - rightMargin)
          .attr('y1', y(minMax.min))
          .attr('y2', y(minMax.min))
          .attr('stroke', '#4D5054')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,4')

        svg.append('text')
          .attr('x', leftMargin - 5)
          .attr('y', y(minMax.min) + 4)
          .attr('text-anchor', 'end')
          .attr('fill', '#4D5054')
          .attr('font-size', '12px')
          .text(`Min ${minMax.min}`)

        svg.append('line')
          .attr('x1', leftMargin)
          .attr('x2', w - rightMargin)
          .attr('y1', y(minMax.max))
          .attr('y2', y(minMax.max))
          .attr('stroke', '#4D5054')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,4')

        svg.append('text')
          .attr('x', leftMargin - 5)
          .attr('y', y(minMax.max) + 4)
          .attr('text-anchor', 'end')
          .attr('fill', '#4D5054')
          .attr('font-size', '12px')
          .text(`Max ${minMax.max}`)
      }
    } else if (minMax.min !== undefined) {
      // Only min is defined
      svg.append('line')
        .attr('x1', leftMargin)
        .attr('x2', w - rightMargin)
        .attr('y1', y(minMax.min))
        .attr('y2', y(minMax.min))
        .attr('stroke', '#4D5054')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')

      svg.append('text')
        .attr('x', leftMargin - 5)
        .attr('y', y(minMax.min) + 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#4D5054')
        .attr('font-size', '12px')
        .text(`Min ${minMax.min}`)
    } else if (minMax.max !== undefined) {
      // Only max is defined
      svg.append('line')
        .attr('x1', leftMargin)
        .attr('x2', w - rightMargin)
        .attr('y1', y(minMax.max))
        .attr('y2', y(minMax.max))
        .attr('stroke', '#4D5054')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')

      svg.append('text')
        .attr('x', leftMargin - 5)
        .attr('y', y(minMax.max) + 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#4D5054')
        .attr('font-size', '12px')
        .text(`Max ${minMax.max}`)
    }
  }, [currentData, minMax, heightChart])
  function getThreadsAverage () {
    const totalThreads = currentData.reduce((partialSum, thread) => partialSum + thread[Object.keys(thread)[0]], 0)
    // return 0 decimal if the value is an integer, 1 if it's not
    const average = totalThreads / currentData.length
    return Number.isInteger(average) ? (average).toFixed(0) : (average).toFixed(1)
  }
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Threads Usage</div>
        <div className={styles.threadCount}>
          <span>
            {getThreadsAverage()}
          </span>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>
            avg.
          </span>
        </div>
      </div>
      {currentData.length === 0 && (
        <NoDataFound title='No Data' subTitle={<span>No thread usage data available.</span>} />
      )}
      {currentData.length > 0 && (
        <svg
          ref={svgRef}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  )
}

export default ThreadUsage
