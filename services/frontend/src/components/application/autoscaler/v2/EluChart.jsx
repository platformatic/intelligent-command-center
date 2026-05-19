import * as d3 from 'd3'
import React, { useEffect, useId, useRef, useState } from 'react'
import { getServiceMetrics } from '~/api/autoscaler'
import { scalerXDomain } from '~/components/metrics/chart_constants.js'
import styles from './EluChart.module.css'

const X_MARGIN = 56
const Y_MARGIN = 20
const BOTTOM_MARGIN = 30

export default function EluChart ({ appId, services, tick }) {
  const svgRef = useRef()
  const rawId = useId()
  const chartId = rawId.replace(/[^a-zA-Z0-9]/g, '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setData(null)
    setLoading(true)
  }, [appId, services])

  useEffect(() => {
    if (!appId || !services?.length) return
    let cancelled = false

    async function fetchData () {
      try {
        const allMetrics = await Promise.all(
          services.map(serviceId => getServiceMetrics(appId, serviceId))
        )
        if (!cancelled) {
          setData(processData(allMetrics, services))
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [appId, services, tick])

  useEffect(() => {
    if (!data || !svgRef.current) return
    renderChart(data, svgRef.current, chartId)
  }, [data, chartId])

  if (loading) {
    return (
      <div className={styles.placeholder}>
        <span className={styles.placeholderText}>Loading…</span>
      </div>
    )
  }

  if (!data || Object.keys(data.lines).length === 0) {
    return (
      <div className={styles.placeholder}>
        <span className={styles.placeholderText}>No data available</span>
      </div>
    )
  }

  return (
    <div className={styles.chartWrapper}>
      <svg ref={svgRef} className={styles.svg} />
    </div>
  )
}

function processData (allMetrics, services) {
  let now = Date.now()
  let threshold = null
  const lines = {}
  for (let i = 0; i < services.length; i++) {
    const metrics = allMetrics[i]
    if (!metrics?.elu) continue

    if (i === 0) {
      now = metrics.elu.now ?? Date.now()
      threshold = metrics.elu.threshold ?? null
    }

    const serviceId = services[i]
    const pts = (metrics.elu.history ?? [])
      .map(d => ({ t: (d.timestamp - now) / 1000, value: d.avg ?? 0 }))
      .filter(d => Number.isFinite(d.t) && Number.isFinite(d.value) && d.t <= 0)

    if (pts.length > 0) {
      lines[serviceId] = [...pts, { t: 0, value: pts.at(-1).value }]
    }
  }

  return { lines, threshold }
}

function formatPct (v) {
  if (!Number.isFinite(v)) return '—'
  return `${Math.round(v * 100)}%`
}

function renderChart (data, svgEl, chartId) {
  const { lines, threshold } = data
  const serviceIds = Object.keys(lines)
  if (serviceIds.length === 0) return

  const width = svgEl.clientWidth || 800
  const height = svgEl.clientHeight || 160

  const innerW = width - X_MARGIN - 10
  const innerH = height - Y_MARGIN - BOTTOM_MARGIN

  const [tMin, tMax] = scalerXDomain
  const x = d3.scaleLinear().domain([tMin, tMax]).range([0, innerW])
  const y = d3.scaleLinear().domain([0, 1]).range([innerH, 0])

  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()
  svg.attr('width', width).attr('height', height)

  // Gradient for hover fill
  const gradId = `eluGrad${chartId}`
  const defs = svg.append('defs')
  const grad = defs.append('linearGradient')
    .attr('id', gradId)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', 0).attr('y1', 0)
    .attr('x2', 0).attr('y2', innerH)
  grad.append('stop').attr('offset', '0%').attr('stop-color', '#C61BE2').attr('stop-opacity', 0.45)
  grad.append('stop').attr('offset', '100%').attr('stop-color', '#C61BE2').attr('stop-opacity', 0)

  const g = svg.append('g').attr('transform', `translate(${X_MARGIN}, ${Y_MARGIN})`)

  // Horizontal grid lines
  const yTicks = [0, 0.5, 1]
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

  const lineGen = d3.line()
    .x(d => x(d.t))
    .y(d => y(d.value))
    .curve(d3.curveLinear)

  const areaGen = d3.area()
    .x(d => x(d.t))
    .y0(innerH)
    .y1(d => y(d.value))
    .curve(d3.curveLinear)

  // Area fills — hidden until hover
  const fillPaths = {}
  for (const id of serviceIds) {
    fillPaths[id] = g.append('path')
      .datum(lines[id])
      .attr('fill', `url(#${gradId})`)
      .attr('opacity', 0)
      .attr('pointer-events', 'none')
      .attr('d', areaGen)
  }

  // Lines
  const linePaths = {}
  for (const id of serviceIds) {
    linePaths[id] = g.append('path')
      .datum(lines[id])
      .attr('fill', 'none')
      .attr('stroke', '#C61BE2')
      .attr('stroke-width', 1)
      .attr('pointer-events', 'none')
      .attr('d', lineGen)
  }

  // Threshold line — only when it falls within the visible domain
  if (threshold != null && threshold >= 0 && threshold <= 1) {
    g.append('line')
      .attr('x1', 0).attr('y1', y(threshold))
      .attr('x2', innerW).attr('y2', y(threshold))
      .attr('stroke', '#5C0E0E')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '6,6')
  }

  // "now" vertical dashed line
  const nowX = x(0)
  g.append('line')
    .attr('x1', nowX).attr('y1', 0)
    .attr('x2', nowX).attr('y2', innerH)
    .attr('stroke', '#4D5054')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '6,6')

  // Tooltip
  const wrapper = svgEl.parentElement
  let tooltip = wrapper.querySelector('[data-elu-tooltip]')
  if (!tooltip) {
    tooltip = document.createElement('div')
    tooltip.setAttribute('data-elu-tooltip', '')
    Object.assign(tooltip.style, {
      position: 'absolute',
      pointerEvents: 'none',
      display: 'none',
      background: '#fff',
      color: '#111',
      borderRadius: '4px',
      padding: '6px 10px',
      fontSize: '12px',
      fontFamily: 'inherit',
      lineHeight: '1.6',
      whiteSpace: 'nowrap',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      zIndex: '10'
    })
    wrapper.appendChild(tooltip)
  }

  const bisect = d3.bisector(d => d.t).center

  // Hover via transparent wide overlay paths
  function handleHover (activeId) {
    for (const id of serviceIds) {
      const isActive = id === activeId
      const isAnyActive = activeId !== null
      linePaths[id]
        .attr('stroke-width', isActive ? 2 : 1)
        .attr('opacity', isAnyActive && !isActive ? 0.1 : 1)
      fillPaths[id]
        .attr('opacity', isActive ? 1 : 0)
    }
    if (activeId === null) tooltip.style.display = 'none'
  }

  for (const id of serviceIds) {
    g.append('path')
      .datum(lines[id])
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 12)
      .attr('d', lineGen)
      .on('mouseenter', () => handleHover(id))
      .on('mousemove', function (event) {
        handleHover(id)
        const [mx] = d3.pointer(event, g.node())
        const t = x.invert(mx)
        const pts = lines[id]
        const idx = Math.max(0, Math.min(bisect(pts, t), pts.length - 1))
        const pt = pts[idx]
        if (!pt) return
        const wrapperRect = wrapper.getBoundingClientRect()
        tooltip.style.display = 'block'
        tooltip.style.left = (event.clientX - wrapperRect.left + 14) + 'px'
        tooltip.style.top = (event.clientY - wrapperRect.top - 42) + 'px'
        tooltip.innerHTML = `<strong>${id}</strong><br>ELU: ${formatPct(pt.value)}`
      })
      .on('mouseleave', () => handleHover(null))
  }

  svg.on('mouseleave', () => handleHover(null))

  // Y axis title
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', -X_MARGIN + 11)
    .attr('text-anchor', 'middle')
    .attr('fill', '#66696D')
    .attr('font-size', '9px')
    .attr('letter-spacing', '0.08em')
    .text('ELU PER APPLICATION')

  // Y axis — percentage labels
  g.append('g')
    .call(
      d3.axisLeft(y)
        .tickValues(yTicks)
        .tickFormat(d => formatPct(d))
    )
    .call(gr => gr.select('.domain').remove())
    .call(gr => gr.selectAll('.tick line').remove())
    .selectAll('text')
    .attr('fill', '#66696D')
    .attr('font-size', '11px')

  // X axis — relative time labels
  g.append('g')
    .attr('transform', `translate(0, ${innerH})`)
    .call(
      d3.axisBottom(x)
        .ticks(8)
        .tickFormat(d => {
          if (d === 0) return ''
          const abs = Math.round(Math.abs(d))
          const sign = d < 0 ? '-' : '+'
          if (abs < 60) return `${sign}${abs}s`
          const m = Math.floor(abs / 60)
          const s = abs % 60
          return s ? `${sign}${m}m${s}s` : `${sign}${m}m`
        })
    )
    .call(gr => gr.select('.domain').remove())
    .call(gr => gr.selectAll('.tick line').remove())
    .selectAll('text')
    .attr('fill', '#66696D')
    .attr('font-size', '11px')
}
