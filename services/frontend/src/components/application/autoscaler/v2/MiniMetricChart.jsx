import * as d3 from 'd3'
import React, { useEffect, useRef, useState } from 'react'
import styles from './MiniMetricChart.module.css'

export default function MiniMetricChart ({ label, value, unit, color, data = [], threshold }) {
  const svgRef = useRef()
  const wrapperRef = useRef()
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
    if (!svgRef.current || !size.width || !size.height || data.length < 2) return
    draw(svgRef.current, data, color, threshold, size.width, size.height)
  }, [data, color, threshold, size])

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.valueRow}>
          <span className={styles.value}>{value}</span>
          <span className={styles.unit}>{unit}</span>
        </span>
      </div>
      <div ref={wrapperRef} className={styles.chartArea}>
        <svg ref={svgRef} className={styles.svg} />
      </div>
    </div>
  )
}

function draw (svgEl, data, color, threshold, width, height) {
  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()
  svg.attr('width', width).attr('height', height)

  const yMin = threshold !== undefined ? Math.min(d3.min(data, d => d.value), threshold * 0.7) : d3.min(data, d => d.value)
  const yMax = threshold !== undefined ? Math.max(d3.max(data, d => d.value), threshold * 1.15) : d3.max(data, d => d.value)
  const pad = (yMax - yMin) * 0.15 || 1

  const x = d3.scaleLinear().domain([0, data.length - 1]).range([0, width])
  const y = d3.scaleLinear().domain([yMin - pad, yMax + pad]).range([height, 0])

  if (threshold !== undefined) {
    const ty = y(threshold)
    if (ty >= 0 && ty <= height) {
      svg.append('line')
        .attr('x1', 0).attr('y1', ty)
        .attr('x2', width).attr('y2', ty)
        .attr('stroke', '#DD3333')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
    }
  }

  const line = d3.line()
    .x((_, i) => x(i))
    .y(d => y(d.value))
    .curve(d3.curveCatmullRom.alpha(0.5))

  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 1.5)
    .attr('d', line)
}
