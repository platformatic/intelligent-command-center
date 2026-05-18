import * as d3 from 'd3'
import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import ScalerPill from '../ScalerPill'
import Hexagon from '../Hexagon'
import Icons from '@platformatic/ui-components/src/components/icons'
import { SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import { getMetricSnapshots } from '~/api/autoscaler'
import { formatAbsolute } from './ScalingEventItem'
import styles from './ScalingEventDetail.module.css'

const ELU_COLOR = '#C61BE2'
const HEAP_COLOR = '#00BCD4'

function groupSnapshots (snapshots) {
  const byService = {}
  for (const s of snapshots) {
    if (!byService[s.serviceId]) byService[s.serviceId] = {}
    byService[s.serviceId][s.metricName] = s.data
  }
  return byService
}

function pickPrimaryService (byService, triggerService) {
  if (triggerService && byService[triggerService]) return triggerService
  return Object.keys(byService)[0] ?? null
}

function getForecastSummary (data, metric) {
  if (!data?.prediction?.length || data.threshold == null) return null
  const { now, prediction, threshold } = data
  const isElu = metric === 'elu'
  const scale = isElu ? 100 : 1
  const unit = isElu ? '%' : ' MB'
  const threshDisplay = Math.round(threshold * scale)
  const valid = prediction.filter(d => Number.isFinite(d.avg) && d.avg >= 0)
  if (!valid.length) return null
  const maxAvg = d3.max(valid, d => d.avg)
  const maxDisplay = Math.round(maxAvg * scale)
  if (maxAvg > threshold) {
    const firstOver = valid.find(d => d.avg > threshold)
    const secs = firstOver ? Math.round((firstOver.timestamp - now) / 1000) : null
    const diff = maxDisplay - threshDisplay
    const timeStr = secs != null ? `within ${secs}s` : 'soon'
    return `Forecast showed ${metric.toUpperCase()} reaching ${maxDisplay}${unit} ${timeStr} — ${diff}${unit} above threshold`
  }
  return `Forecast showed ${metric.toUpperCase()} remaining below the ${threshDisplay}${unit} threshold`
}

function SignalCard ({ metric, data }) {
  if (!data) {
    return (
      <div className={styles.signalCard}>
        <div className={styles.signalHeader}>
          <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite70}`}>
            {metric.toUpperCase()}
          </span>
        </div>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>—</span>
      </div>
    )
  }

  const isElu = metric === 'elu'
  const scale = isElu ? 100 : 1
  const unit = isElu ? '%' : ' MB'
  const color = isElu ? ELU_COLOR : HEAP_COLOR

  const lastPt = data.history?.at(-1)
  const current = lastPt ? Math.round(lastPt.avg * scale * 10) / 10 : null
  const threshold = data.threshold != null ? Math.round(data.threshold * scale) : null
  const pct = (current != null && threshold > 0) ? Math.min(1, current / threshold) : 0
  const overThreshold = current != null && threshold != null && current >= threshold
  const trend = data.trendDirection

  return (
    <div className={styles.signalCard}>
      <div className={styles.signalHeader}>
        <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite70}`}>
          {metric.toUpperCase()}
        </span>
        {current != null && (
          <span className={styles.signalValue}>
            <strong className={`${typographyStyles.desktopHeadline3} ${typographyStyles.textWhite}`}>
              {Math.round(current)}
            </strong>
            {threshold != null && (
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>
                {' '}/ {threshold}{unit}
              </span>
            )}
          </span>
        )}
      </div>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{
            width: `${pct * 100}%`,
            backgroundColor: overThreshold ? '#E53935' : color
          }}
        />
      </div>
      <div className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70} ${styles.trendRow}`}>
        {trend === 'up' && 'Raising ↗'}
        {trend === 'down' && 'Lowering ↘'}
        {trend === 'horizontal' && 'Stable →'}
      </div>
    </div>
  )
}

function renderForecastChart (svgEl, data, metric, chartId, width, height) {
  if (!data || !svgEl || !width || !height) return

  const { history = [], prediction = [], now, threshold } = data
  const isElu = metric === 'elu'
  const scale = isElu ? 100 : 1

  const histPts = history
    .map(d => ({ t: (d.timestamp - now) / 1000, v: d.avg * scale }))
    .filter(d => Number.isFinite(d.t) && Number.isFinite(d.v))

  const predPts = prediction
    .map(d => ({ t: (d.timestamp - now) / 1000, v: d.avg * scale }))
    .filter(d => Number.isFinite(d.t) && Number.isFinite(d.v) && d.v >= 0)

  const color = isElu ? ELU_COLOR : HEAP_COLOR
  const threshVal = threshold != null ? threshold * scale : null

  const L = 44; const R = 8; const T = 28; const B = 30
  const iW = width - L - R
  const iH = height - T - B

  const allPts = [...histPts, ...predPts]
  if (!allPts.length) return

  const tMin = d3.min(allPts, d => d.t)
  const tMax = d3.max(allPts, d => d.t)
  const vMax = Math.max(
    d3.max(allPts, d => d.v) ?? 0,
    threshVal ?? 0
  ) * 1.25 || 1

  const x = d3.scaleLinear().domain([tMin, tMax]).range([0, iW])
  const y = d3.scaleLinear().domain([0, vMax]).range([iH, 0])

  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()
  svg.attr('width', width).attr('height', height)

  const defs = svg.append('defs')
  const patId = `hatch${chartId}`
  const pat = defs.append('pattern')
    .attr('id', patId).attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 8).attr('height', 8)
    .attr('patternTransform', 'rotate(45)')
  pat.append('line')
    .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 8)
    .attr('stroke', '#ffffff').attr('stroke-opacity', 0.06).attr('stroke-width', 3)

  const g = svg.append('g').attr('transform', `translate(${L}, ${T})`)

  const decisionX = x(0)

  // Hatched prediction zone
  if (decisionX < iW) {
    g.append('rect')
      .attr('x', decisionX).attr('y', 0)
      .attr('width', iW - decisionX).attr('height', iH)
      .attr('fill', `url(#${patId})`)
  }

  // Grid lines
  const yTicks = y.ticks(5)
  g.append('g')
    .call(d3.axisLeft(y).tickValues(yTicks).tickSize(-iW).tickFormat(''))
    .call(gr => gr.select('.domain').remove())
    .selectAll('line').attr('stroke', '#1A1E23').attr('stroke-width', 1)

  // Threshold line (dashed red)
  if (threshVal != null && threshVal >= 0 && threshVal <= vMax) {
    g.append('line')
      .attr('x1', 0).attr('y1', y(threshVal))
      .attr('x2', iW).attr('y2', y(threshVal))
      .attr('stroke', '#E53935').attr('stroke-width', 1)
      .attr('stroke-dasharray', '6,4')
  }

  const lineGen = d3.line().x(d => x(d.t)).y(d => y(d.v)).curve(d3.curveLinear)

  if (histPts.length > 0) {
    g.append('path').datum(histPts)
      .attr('fill', 'none').attr('stroke', color)
      .attr('stroke-width', 1.5).attr('d', lineGen)
  }

  if (predPts.length > 0) {
    g.append('path').datum(predPts)
      .attr('fill', 'none').attr('stroke', color)
      .attr('stroke-width', 1.5).attr('stroke-dasharray', '5,4')
      .attr('d', lineGen)
  }

  // Decision line
  g.append('line')
    .attr('x1', decisionX).attr('y1', -T + 4)
    .attr('x2', decisionX).attr('y2', iH)
    .attr('stroke', '#B2B4B6').attr('stroke-width', 1)

  // Labels above chart
  g.append('text').attr('x', 4).attr('y', -10)
    .attr('text-anchor', 'start').attr('fill', '#66696D')
    .attr('font-size', '9px').attr('letter-spacing', '0.08em')
    .text('◄ PAST')
  g.append('text').attr('x', decisionX).attr('y', -10)
    .attr('text-anchor', 'middle').attr('fill', '#B2B4B6')
    .attr('font-size', '9px').attr('letter-spacing', '0.1em')
    .text('DECISION')
  g.append('text').attr('x', iW - 4).attr('y', -10)
    .attr('text-anchor', 'end').attr('fill', '#66696D')
    .attr('font-size', '9px').attr('letter-spacing', '0.08em')
    .text('PREDICTION ►')

  // Y axis
  const tickFmt = isElu ? d => `${Math.round(d)}%` : d => String(Math.round(d))
  g.append('g')
    .call(d3.axisLeft(y).tickValues(yTicks).tickFormat(tickFmt))
    .call(gr => gr.select('.domain').remove())
    .call(gr => gr.selectAll('.tick line').remove())
    .selectAll('text').attr('fill', '#66696D').attr('font-size', '10px')

  // X axis
  g.append('g')
    .attr('transform', `translate(0, ${iH})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d => {
      if (d === 0) return '0"'
      const abs = Math.round(Math.abs(d))
      const sign = d < 0 ? '-' : '+'
      return abs < 60 ? `${sign}${abs}"` : `${sign}${Math.floor(abs / 60)}m`
    }))
    .call(gr => gr.select('.domain').remove())
    .call(gr => gr.selectAll('.tick line').remove())
    .selectAll('text').attr('fill', '#66696D').attr('font-size', '10px')
}

export default function ScalingEventDetail ({ event, appId }) {
  const svgRef = useRef()
  const roRef = useRef(null)
  const rawId = useId()
  const chartId = rawId.replace(/[^a-zA-Z0-9]/g, '')
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeMetric, setActiveMetric] = useState('elu')
  const [size, setSize] = useState({ width: 0, height: 0 })

  const wrapperRef = useCallback((node) => {
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null }
    if (!node) return
    const ro = new window.ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    ro.observe(node)
    roRef.current = ro
  }, [])

  useEffect(() => {
    if (!event?.id) return
    setSnapshots([])
    setLoading(true)
    getMetricSnapshots(event.id).then(data => {
      setSnapshots(data)
      setLoading(false)
    })
  }, [event?.id])

  const byService = snapshots.length ? groupSnapshots(snapshots) : {}
  const primaryService = pickPrimaryService(byService, event?.serviceName)
  const eluData = primaryService ? byService[primaryService]?.elu : null
  const heapData = primaryService ? byService[primaryService]?.heap : null
  const activeData = activeMetric === 'elu' ? eluData : heapData

  useEffect(() => {
    if (!activeData || !svgRef.current || !size.width || !size.height) return
    renderForecastChart(svgRef.current, activeData, activeMetric, chartId, size.width, size.height)
  }, [activeData, activeMetric, chartId, size])

  const { direction, serviceName, allServices, metrics, timestamp, description } = event
  const from = metrics?.pods?.from ?? '?'
  const to = metrics?.pods?.to ?? '?'
  const delta = (metrics?.pods?.to != null && metrics?.pods?.from != null)
    ? to - from
    : null
  const deltaLabel = delta != null ? (delta > 0 ? `+ ${delta}` : String(delta)) : ''
  const serviceLabel = allServices ? 'All applications' : (serviceName ?? '—')
  const forecastSummary = getForecastSummary(activeData, activeMetric)

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>
          Event Details
        </span>
      </div>

      <div className={styles.metaRow}>
        <ScalerPill direction={direction} />
        <div className={styles.podsRow}>
          <Hexagon number={from} color={WHITE} borderColor={WHITE} />
          <Icons.ArrowRightIcon size={SMALL} color={WHITE} />
          {delta != null && (
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>
              {deltaLabel}
            </span>
          )}
          <Icons.ArrowRightIcon size={SMALL} color={WHITE} />
          <Hexagon number={to} color='tertiary-blue' borderColor='tertiary-blue' />
        </div>
      </div>

      <div className={styles.serviceRow}>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>Application:</span>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{serviceLabel}</span>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>At:</span>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{formatAbsolute(timestamp)}</span>
      </div>

      {loading && (
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>Loading…</span>
      )}

      {!loading && snapshots.length > 0 && (
        <>
          <div className={styles.section}>
            <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite70} ${styles.sectionTitle}`}>
              Signal Snapshot at Decision Time
            </span>
            <div className={styles.signalCards}>
              <SignalCard metric='elu' data={eluData} />
              <SignalCard metric='heap' data={heapData} />
            </div>
          </div>

          {direction !== 'down' && (
            <div className={styles.section}>
              <div className={styles.sectionTitleRow}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite70} ${styles.sectionTitle}`}>
                  Forecast at Decision Time
                </span>
                <div className={styles.metricToggle}>
                  <button
                    type='button'
                    className={`${styles.toggleBtn} ${activeMetric === 'elu' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setActiveMetric('elu')}
                  >
                    <span className={typographyStyles.desktopBodySmall}>ELU</span>
                  </button>
                  <button
                    type='button'
                    className={`${styles.toggleBtn} ${activeMetric === 'heap' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setActiveMetric('heap')}
                  >
                    <span className={typographyStyles.desktopBodySmall}>Heap</span>
                  </button>
                </div>
              </div>
              <div ref={wrapperRef} className={styles.chartWrapper}>
                <svg ref={svgRef} className={styles.svg} />
              </div>
              {forecastSummary && (
                <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70} ${styles.forecastSummary}`}>
                  {forecastSummary}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {description && (
        <div className={styles.section}>
          <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite70} ${styles.sectionTitle}`}>
            Decision Context
          </span>
          <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70} ${styles.contextText}`}>
            {description}
          </p>
        </div>
      )}
    </div>
  )
}
