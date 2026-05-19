import * as d3 from 'd3'
import React, { useEffect, useId, useRef, useState } from 'react'
import { getServiceMetrics, getAppCount } from '~/api/autoscaler'
import { scalerXDomain } from '~/components/metrics/chart_constants.js'
import styles from './ServiceCharts.module.css'
import { unitPluralUpper } from './unitLabel'

const L = 56 // left margin (y-axis label + ticks)
const R = 12 // right margin
const T = 30 // top margin (region labels)
const B = 28 // bottom margin (x-axis)

const CONFIGS = [
  { type: 'pods', yLabel: `${unitPluralUpper} (#)`, color: '#2588E4' },
  { type: 'elu', yLabel: 'AGGREGATED ELU', color: '#C61BE2' },
  { type: 'heap', yLabel: 'AGGREGATED HEAP (MB)', color: '#00BCD4' }
]

export default function ServiceCharts ({ appId, serviceId, tick }) {
  const [metrics, setMetrics] = useState(null)
  const [appCount, setAppCount] = useState(null)

  useEffect(() => {
    if (!appId || !serviceId) return
    let cancelled = false

    Promise.all([
      getServiceMetrics(appId, serviceId),
      getAppCount(appId)
    ]).then(([svcMetrics, countData]) => {
      if (cancelled) return
      setMetrics(svcMetrics)
      if (countData) setAppCount(countData)
    })

    return () => { cancelled = true }
  }, [appId, serviceId, tick])

  function getChartData (type) {
    if (type === 'pods') return appCount
    if (type === 'elu') return metrics?.elu ?? null
    if (type === 'heap') return metrics?.heap ?? null
    return null
  }

  return (
    <div className={styles.root}>
      {CONFIGS.map(cfg => (
        <MetricChart key={cfg.type} data={getChartData(cfg.type)} config={cfg} />
      ))}
    </div>
  )
}

function MetricChart ({ data, config }) {
  const wrapperRef = useRef()
  const svgRef = useRef()
  const rawId = useId()
  const chartId = rawId.replace(/[^a-zA-Z0-9]/g, '')
  const [size, setSize] = useState({ width: 0, height: 0 })

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
    if (!svgRef.current || !size.width || !size.height || !data) return
    draw(svgRef.current, data, config, size.width, size.height, chartId)
  }, [data, config, size, chartId])

  return (
    <div className={styles.chartItem}>
      <div ref={wrapperRef} className={styles.chartWrapper}>
        {!data
          ? (
            <div className={styles.placeholder}>
              <span className={styles.placeholderText}>Loading…</span>
            </div>
            )
          : <svg ref={svgRef} className={styles.svg} />}
      </div>
    </div>
  )
}

function draw (svgEl, data, config, width, height, chartId) {
  const { history, prediction, now, initTimeoutMs, threshold } = data
  const { type, yLabel, color } = config

  const iW = width - L - R
  const iH = height - T - B
  if (iW <= 0 || iH <= 0) return

  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()
  svg.attr('width', width).attr('height', height)

  const [tStart, tEnd] = scalerXDomain
  const x = d3.scaleLinear().domain([tStart, tEnd]).range([0, iW])

  // Y + data points
  let y, histPts, predPts, threshVal

  if (type === 'pods') {
    const pMax = Math.max(10, ...history.map(d => d.count), ...prediction.map(d => d.count))
    y = d3.scaleLinear().domain([0, Math.ceil(pMax * 1.15)]).range([iH, 0])
    predPts = prediction.map(d => ({ t: (d.timestamp - now) / 1000, v: d.count }))
    const rawHistPts = history
      .map(d => ({ t: (d.timestamp - now) / 1000, v: d.count }))
      .filter(d => d.t >= tStart && d.t <= 0)
    if (rawHistPts.length <= 1) {
      const podCount = rawHistPts.length === 1
        ? rawHistPts[0].v
        : (predPts.length > 0 ? predPts[0].v : 0)
      histPts = [{ t: tStart, v: podCount }, { t: 0, v: podCount }]
    } else {
      const first = rawHistPts[0]
      const last = rawHistPts[rawHistPts.length - 1]
      histPts = [
        ...(first.t > tStart ? [{ t: tStart, v: first.v }] : []),
        ...rawHistPts,
        ...(last.t < 0 ? [{ t: 0, v: last.v }] : [])
      ]
    }
  } else if (type === 'elu') {
    y = d3.scaleLinear().domain([0, 1]).range([iH, 0])
    histPts = history.map(d => ({ t: (d.timestamp - now) / 1000, v: d.avg }))
    predPts = prediction.map(d => ({ t: (d.timestamp - now) / 1000, v: d.avg }))
    threshVal = threshold
  } else {
    const allVals = [...history.map(d => d.avg ?? 0), ...prediction.map(d => d.avg ?? 0), threshold ?? 0]
    const vMax = Math.max(...allVals, 0.01)
    const yTop = vMax <= 1.05 ? 1 : Math.ceil(vMax * 1.15 / 25) * 25
    y = d3.scaleLinear().domain([0, yTop]).range([iH, 0])
    histPts = history.map(d => ({ t: (d.timestamp - now) / 1000, v: d.avg ?? 0 }))
    predPts = prediction.map(d => ({ t: (d.timestamp - now) / 1000, v: d.avg ?? 0 }))
    threshVal = threshold
  }

  const defs = svg.append('defs')

  // Hatched pattern for future region
  const hId = `h${chartId}`
  const pat = defs.append('pattern')
    .attr('id', hId).attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 10).attr('height', 10)
  pat.append('rect').attr('width', 10).attr('height', 10).attr('fill', '#00050B')
  pat.append('line')
    .attr('x1', 0).attr('y1', 10).attr('x2', 10).attr('y2', 0)
    .attr('stroke', 'rgba(255,255,255,0.05)').attr('stroke-width', 2.5)

  // Area gradient
  const gId = `g${chartId}`
  const grad = defs.append('linearGradient')
    .attr('id', gId).attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', iH)
  grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.28)
  grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0)

  const g = svg.append('g').attr('transform', `translate(${L},${T})`)

  // Future hatched background
  g.append('rect')
    .attr('x', x(0)).attr('y', 0)
    .attr('width', Math.max(0, iW - x(0))).attr('height', iH)
    .attr('fill', `url(#${hId})`)

  // Grid lines
  const yTicks = type === 'elu' ? [0, 0.5, 1] : y.ticks(5)
  g.append('g')
    .call(d3.axisLeft(y).tickValues(yTicks).tickSize(-iW).tickFormat(''))
    .call(gr => gr.select('.domain').remove())
    .selectAll('line').attr('stroke', '#1A1E23').attr('stroke-width', 1)

  // Threshold line
  if (threshVal !== undefined) {
    g.append('line')
      .attr('x1', 0).attr('y1', y(threshVal))
      .attr('x2', iW).attr('y2', y(threshVal))
      .attr('stroke', '#CC2222').attr('stroke-width', 1)
      .attr('stroke-dasharray', '5,4')
  }

  // Past area + line
  if (histPts.length > 0) {
    const curve = type === 'pods' ? d3.curveStepAfter : d3.curveLinear
    g.append('path').datum(histPts)
      .attr('fill', `url(#${gId})`)
      .attr('d', d3.area().x(d => x(d.t)).y0(iH).y1(d => y(d.v)).curve(curve))
    g.append('path').datum(histPts)
      .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 1.5)
      .attr('d', d3.line().x(d => x(d.t)).y(d => y(d.v)).curve(curve))
  }

  // Prediction
  if (type === 'pods') {
    const lastHistV = histPts.length > 0 ? histPts[histPts.length - 1].v : (predPts[0]?.v ?? 0)
    const predEndV = predPts.length > 0 ? predPts[predPts.length - 1].v : lastHistV
    const podPredData = predPts.length > 0
      ? [...predPts, { t: tEnd, v: predEndV }]
      : [{ t: 0, v: lastHistV }, { t: tEnd, v: lastHistV }]
    g.append('path')
      .datum(podPredData)
      .attr('fill', 'none')
      .attr('stroke', '#FEB928')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,4')
      .attr('d', d3.line().x(d => x(d.t)).y(d => y(d.v)).curve(d3.curveStepAfter))
  } else if (predPts.length > 0) {
    const firstPred = predPts[0]
    const lastPred = predPts[predPts.length - 1]
    g.append('path').datum([...predPts, { t: tEnd, v: lastPred.v }])
      .attr('fill', 'none').attr('stroke', '#FEB928').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,4')
      .attr('d', d3.line().x(d => x(d.t)).y(d => y(d.v)))
    g.append('circle')
      .attr('cx', x(firstPred.t)).attr('cy', y(firstPred.v))
      .attr('r', 3.5).attr('fill', '#FEB928')
  }

  // NOW line — starts just below the "NOW" label so it doesn't cross the text.
  g.append('line')
    .attr('x1', x(0)).attr('y1', 0)
    .attr('x2', x(0)).attr('y2', iH)
    .attr('stroke', 'rgba(255,255,255,0.85)').attr('stroke-width', 1.5)

  // INIT dashed line — same: starts at chart top, below the "INIT" label.
  const initSec = initTimeoutMs / 1000
  const initX = x(initSec)
  if (initX < iW) {
    g.append('line')
      .attr('x1', initX).attr('y1', 0)
      .attr('x2', initX).attr('y2', iH)
      .attr('stroke', '#4D5054').attr('stroke-width', 1)
      .attr('stroke-dasharray', '6,4')
  }

  // Y axis tick labels
  g.append('g')
    .call(d3.axisLeft(y).tickValues(yTicks)
      .tickFormat(d => type === 'elu' ? `${Math.round(d * 100)}%` : String(Math.round(d))))
    .call(gr => gr.select('.domain').remove())
    .call(gr => gr.selectAll('.tick line').remove())
    .selectAll('text').attr('fill', '#66696D').attr('font-size', '10px')

  // Y axis rotated label
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -iH / 2).attr('y', -L + 11)
    .attr('text-anchor', 'middle')
    .attr('fill', '#66696D').attr('font-size', '8px').attr('letter-spacing', '0.09em')
    .text(yLabel)

  // X axis
  const xTicks = d3.range(tStart, tEnd + 1, 10)
  g.append('g')
    .attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(x)
      .tickValues(xTicks)
      .tickFormat(d => {
        if (d === 0) return ''
        const abs = Math.round(Math.abs(d))
        const sign = d < 0 ? '-' : '+'
        return `${sign}${abs}s`
      }))
    .call(gr => gr.select('.domain').remove())
    .call(gr => gr.selectAll('.tick line').remove())
    .selectAll('text').attr('fill', '#66696D').attr('font-size', '10px')

  // Region labels (in top margin). Two rows: section labels (◄ PAST,
  // PREDICTED ►) sit higher, point labels (NOW, INIT) sit lower so they
  // don't collide when an INIT label lands close to the right-side label.
  const lYTop = -18
  const lYBottom = -3

  // ◄ PAST — upper row
  g.append('text').attr('x', 4).attr('y', lYTop)
    .attr('fill', '#4D5054').attr('font-size', '9px').attr('letter-spacing', '0.07em')
    .text('◄ PAST')

  // NOW — lower row
  g.append('text').attr('x', x(0)).attr('y', lYBottom)
    .attr('text-anchor', 'middle')
    .attr('fill', 'rgba(255,255,255,0.8)').attr('font-size', '9px').attr('letter-spacing', '0.07em')
    .text('NOW')

  const rightLabel = type === 'pods' ? 'SCHEDULED ►' : 'PREDICTED ►'
  if (initX > x(0) + 24 && initX < iW - 4) {
    const initLabel = 'INIT'
    // INIT — lower row, centered on the init line
    g.append('text').attr('x', initX).attr('y', lYBottom)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.8)').attr('font-size', '9px').attr('letter-spacing', '0.07em')
      .text(initLabel)

    // PREDICTED ► / SCHEDULED ► — upper row
    g.append('text').attr('x', (initX + iW) / 2).attr('y', lYTop)
      .attr('text-anchor', 'middle')
      .attr('fill', '#4D5054').attr('font-size', '9px').attr('letter-spacing', '0.07em')
      .text(rightLabel)
  } else {
    g.append('text').attr('x', (x(0) + iW) / 2).attr('y', lYTop)
      .attr('text-anchor', 'middle')
      .attr('fill', '#4D5054').attr('font-size', '9px').attr('letter-spacing', '0.07em')
      .text(rightLabel)
  }

  // Tooltip + crosshair
  const wrapper = svgEl.parentElement
  let tooltip = wrapper.querySelector('[data-svc-tooltip]')
  if (!tooltip) {
    tooltip = document.createElement('div')
    tooltip.setAttribute('data-svc-tooltip', '')
    Object.assign(tooltip.style, {
      position: 'absolute',
      pointerEvents: 'none',
      display: 'none',
      background: '#fff',
      color: '#111',
      borderRadius: '4px',
      padding: '5px 9px',
      fontSize: '12px',
      fontFamily: 'inherit',
      lineHeight: '1.5',
      whiteSpace: 'nowrap',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      zIndex: '10'
    })
    wrapper.appendChild(tooltip)
  }

  const crosshair = g.append('line')
    .attr('y1', 0).attr('y2', iH)
    .attr('stroke', 'rgba(255,255,255,0.35)')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3')
    .attr('display', 'none')
    .attr('pointer-events', 'none')

  const allPts = [...(histPts ?? []), ...(predPts ?? [])].sort((a, b) => a.t - b.t)
  const bisect = d3.bisector(d => d.t).center

  function fmtValue (v) {
    if (type === 'elu') return `${Math.round(v * 100)}%`
    if (type === 'heap') return `${Math.round(v)} MB`
    const n = Math.round(v)
    return `${n} ${n === 1 ? 'pod' : 'pods'}`
  }

  g.append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', iW).attr('height', iH)
    .attr('fill', 'transparent')
    .on('mousemove', function (event) {
      const [mx] = d3.pointer(event)
      const t = x.invert(mx)
      const idx = Math.max(0, Math.min(bisect(allPts, t), allPts.length - 1))
      const pt = allPts[idx]
      if (!pt) return
      crosshair.attr('x1', mx).attr('x2', mx).attr('display', null)
      const wrapperRect = wrapper.getBoundingClientRect()
      tooltip.style.display = 'block'
      tooltip.style.left = (event.clientX - wrapperRect.left + 14) + 'px'
      tooltip.style.top = (event.clientY - wrapperRect.top - 42) + 'px'
      tooltip.textContent = fmtValue(pt.v)
    })
    .on('mouseleave', function () {
      crosshair.attr('display', 'none')
      tooltip.style.display = 'none'
    })
}
