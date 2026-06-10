import * as d3 from 'd3'
import { drawFutureHatch } from './chartHatch'
import React, { useEffect, useId, useRef, useState } from 'react'
import { getAppCount } from '~/api/autoscaler'
import { scalerXDomain } from '~/components/metrics/chart_constants.js'
import { unitPluralUpper } from './unitLabel'
import styles from './PodCountChart.module.css'

const X_MARGIN = 64
const Y_MARGIN = 38
const BOTTOM_MARGIN = 30

export default function PodCountChart ({ appId, serviceId, tick }) {
  const svgRef = useRef()
  const wrapperRef = useRef()
  const rawId = useId()
  const chartId = rawId.replace(/[^a-zA-Z0-9]/g, '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    setData(null)
    setLoading(true)
  }, [appId])

  useEffect(() => {
    if (!appId) return
    let cancelled = false

    async function fetchData () {
      try {
        const count = await getAppCount(appId)
        if (!cancelled) {
          setData(count ?? null)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [appId, tick])

  useEffect(() => {
    if (!wrapperRef.current) return
    const ro = new window.ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!data || !svgRef.current || !size.width || !size.height) return
    renderChart(data, svgRef.current, chartId, size.width, size.height)
  }, [data, chartId, size])

  return (
    <div ref={wrapperRef} className={styles.chartWrapper}>
      <svg ref={svgRef} className={styles.svg} />
      {loading && (
        <div className={styles.overlay}>
          <span className={styles.placeholderText}>Loading…</span>
        </div>
      )}
      {!loading && !data && (
        <div className={styles.overlay}>
          <span className={styles.placeholderText}>No data available</span>
        </div>
      )}
    </div>
  )
}

function renderChart (countData, svgEl, chartId, width, height) {
  const { history = [], prediction = [], now, initTimeoutMs } = countData

  const innerW = width - X_MARGIN - 10
  const innerH = height - Y_MARGIN - BOTTOM_MARGIN

  const [tMin, tMax] = scalerXDomain

  const rawHistPts = history
    .map(d => ({ t: (d.timestamp - now) / 1000, pods: d.count ?? 0 }))
    .filter(d => Number.isFinite(d.t) && Number.isFinite(d.pods) && d.t >= tMin && d.t <= 0)
    .sort((a, b) => a.t - b.t)

  const predPts = prediction
    .map(d => ({ t: (d.timestamp - now) / 1000, pods: d.count ?? 0 }))
    .filter(d => Number.isFinite(d.t) && Number.isFinite(d.pods))

  // When there is no meaningful history, extend a flat line across the past
  const histPts = rawHistPts.length <= 1
    ? (() => {
        const podCount = rawHistPts.length === 1
          ? rawHistPts[0].pods
          : (predPts.length > 0 ? predPts[0].pods : 0)
        return [{ t: tMin, pods: podCount }, { t: 0, pods: podCount }]
      })()
    : [
        ...(rawHistPts[0].t > tMin ? [{ t: tMin, pods: rawHistPts[0].pods }] : []),
        ...rawHistPts,
        { t: 0, pods: rawHistPts.at(-1).pods }
      ]

  const allP = [...histPts.map(d => d.pods), ...predPts.map(d => d.pods)]
  const pMax = allP.length ? Math.max(...allP) : 4
  const yMax = Math.max(Math.ceil(pMax * 1.2), 2)

  const x = d3.scaleLinear().domain([tMin, tMax]).range([0, innerW])
  const y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0])

  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()
  svg.attr('width', width).attr('height', height)

  // Gradient
  const gradId = `podGrad${chartId}`
  const defs = svg.append('defs')
  const grad = defs.append('linearGradient')
    .attr('id', gradId)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', 0).attr('y1', 0)
    .attr('x2', 0).attr('y2', innerH)
  grad.append('stop').attr('offset', '0%').attr('stop-color', '#2588E4').attr('stop-opacity', 0.15)
  grad.append('stop').attr('offset', '100%').attr('stop-color', '#2588E4').attr('stop-opacity', 0)

  const g = svg.append('g').attr('transform', `translate(${X_MARGIN}, ${Y_MARGIN})`)

  // Horizontal grid lines — evenly spaced integers spanning full domain
  const tickStep = yMax <= 5 ? 1 : Math.ceil(yMax / 5)
  const yTicks = d3.range(0, yMax + 1, tickStep)
  g.append('g')
    .call(
      d3.axisLeft(y)
        .tickValues(yTicks)
        .tickSize(-innerW)
        .tickFormat('')
    )
    .call(gr => gr.select('.domain').remove())
    .selectAll('line')
    .attr('stroke', '#1A1E23')
    .attr('stroke-width', 1)

  // Y axis vertical line
  g.append('line')
    .attr('x1', 0).attr('y1', 0)
    .attr('x2', 0).attr('y2', innerH)
    .attr('stroke', '#4D5054')
    .attr('stroke-width', 1)

  drawFutureHatch(defs, g, `podHatch${chartId}`, x, innerW, innerH)

  // History area fill
  if (histPts.length > 0) {
    const area = d3.area()
      .x(d => x(d.t))
      .y0(innerH)
      .y1(d => y(d.pods))
      .curve(d3.curveStepAfter)

    g.append('path')
      .datum(histPts)
      .attr('fill', `url(#${gradId})`)
      .attr('d', area)

    // History line
    const histLine = d3.line()
      .x(d => x(d.t))
      .y(d => y(d.pods))
      .curve(d3.curveStepAfter)

    g.append('path')
      .datum(histPts)
      .attr('fill', 'none')
      .attr('stroke', '#2588E4')
      .attr('stroke-width', 1.5)
      .attr('d', histLine)
  }

  // Prediction line (dashed amber) — always drawn to chart end
  const lastHistPods = histPts.length > 0 ? histPts[histPts.length - 1].pods : 0
  const predEndPods = predPts.length > 0 ? predPts[predPts.length - 1].pods : lastHistPods
  const predData = predPts.length > 0
    ? [...predPts, { t: tMax, pods: predEndPods }]
    : [{ t: 0, pods: lastHistPods }, { t: tMax, pods: lastHistPods }]

  const predLine = d3.line()
    .x(d => x(d.t))
    .y(d => y(d.pods))
    .curve(d3.curveStepAfter)

  g.append('path')
    .datum(predData)
    .attr('fill', 'none')
    .attr('stroke', '#FEB928')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '6,6')
    .attr('d', predLine)

  // "now" vertical dashed line
  const nowX = x(0)
  g.append('line')
    .attr('x1', nowX).attr('y1', -5)
    .attr('x2', nowX).attr('y2', innerH)
    .attr('stroke', '#4D5054')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '6,6')

  // "now" label
  g.append('text')
    .attr('x', nowX)
    .attr('y', -3)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(255,255,255,0.8)')
    .attr('font-size', '9px')
    .attr('letter-spacing', '0.07em')
    .text('NOW')

  // "init" vertical dashed line
  if (initTimeoutMs) {
    const initX = x(initTimeoutMs / 1000)
    if (initX > nowX && initX < innerW) {
      g.append('line')
        .attr('x1', initX).attr('y1', -5)
        .attr('x2', initX).attr('y2', innerH)
        .attr('stroke', '#4D5054')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '6,4')
      g.append('text')
        .attr('x', initX)
        .attr('y', -3)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255,255,255,0.8)')
        .attr('font-size', '9px')
        .attr('letter-spacing', '0.07em')
        .text('INIT')
    }
  }

  // Region labels (top of chart)
  g.append('text')
    .attr('x', 0)
    .attr('y', -18)
    .attr('text-anchor', 'start')
    .attr('fill', '#4D5054')
    .attr('font-size', '9px')
    .attr('letter-spacing', '0.07em')
    .text('◄ PAST')

  g.append('text')
    .attr('x', innerW)
    .attr('y', -18)
    .attr('text-anchor', 'end')
    .attr('fill', '#4D5054')
    .attr('font-size', '9px')
    .attr('letter-spacing', '0.07em')
    .text('SCHEDULED ►')

  // Y axis title
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', -X_MARGIN + 19)
    .attr('text-anchor', 'middle')
    .attr('fill', '#66696D')
    .attr('font-size', '9px')
    .attr('letter-spacing', '0.08em')
    .text(`${unitPluralUpper} (#)`)

  // Y axis labels
  g.append('g')
    .call(
      d3.axisLeft(y)
        .tickValues(yTicks)
        .tickFormat(d => Math.round(d))
    )
    .call(gr => gr.select('.domain').remove())
    .call(gr => gr.selectAll('.tick line').remove())
    .selectAll('text')
    .attr('fill', '#66696D')
    .attr('font-size', '11px')

  // X axis labels
  g.append('g')
    .attr('transform', `translate(0, ${innerH})`)
    .call(
      d3.axisBottom(x)
        .ticks(8)
        .tickFormat(d => {
          if (d === 0) return ''
          const abs = Math.round(Math.abs(d))
          const sign = d < 0 ? '-' : '+'
          return `${sign}${abs}s`
        })
    )
    .call(gr => gr.select('.domain').remove())
    .call(gr => gr.selectAll('.tick line').remove())
    .selectAll('text')
    .attr('fill', '#66696D')
    .attr('font-size', '11px')
}
