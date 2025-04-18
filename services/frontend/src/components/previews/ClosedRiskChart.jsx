import { useRef, useState, useLayoutEffect } from 'react'
import styles from './ClosedRiskChart.module.css'
import * as d3 from 'd3'
import typographyStyles from '~/styles/Typography.module.css'
import { LOW_RISK, MEDIUM_RISK } from './previewUtils'
import { BorderedBox } from '@platformatic/ui-components'
import { TRANSPARENT, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'
import { getTicks } from '~/components/metrics/utils.js'

const xMargin = 25
const yMargin = 20

const getColorFromRisk = (data) => {
  if (LOW_RISK(data)) {
    return 'green'
  } else if (MEDIUM_RISK(data)) {
    return 'orange'
  } else {
    return 'red'
  }
}

const useWindowSize = () => {
  const [size, setSize] = useState([0, 0])
  useLayoutEffect(() => {
    const updateSize = () => {
      setSize([window.innerWidth, window.innerHeight])
    }
    window.addEventListener('resize', updateSize)
    updateSize()
    return () => window.removeEventListener('resize', updateSize)
  }, [])
  return size
}

function ClosedRiskChart ({ closedPreviews = [] }) {
  const [svgRef, setSvgRef] = useState()
  // This is basically a trick to force the component to re-render when the window size changes
  useWindowSize()

  const tooltipRef = useRef()

  const data = closedPreviews.map(preview => {
    return {
      closedAt: new Date(preview.closedAt),
      risk: preview.risk
    }
  })

  data.sort((a, b) => a.closedAt - b.closedAt)

  if (svgRef) {
    const h = svgRef.clientHeight
    const w = svgRef.clientWidth

    const svg = d3
      .select(svgRef)

    const tooltip = d3
      .select(tooltipRef.current)

    svg.selectAll('*').remove() // clean up the svg

    // X axis and domain
    const x = d3.scaleTime([xMargin, w - 10])
    if (data.length !== 0) {
      const firstDatum = data[0]
      const lastDatum = data[data.length - 1]
      const firstTime = firstDatum.closedAt
      const lastTime = lastDatum.closedAt
      x.domain([firstTime, lastTime])
    } else {
      // If no data, show the last month on x domain
      const d = new Date()
      d.setMonth(d.getMonth() - 1)
      x.domain([d, new Date()])
    }
    const xAxis = d3.axisBottom().scale(x)

    // Y axis and domain
    const y = d3.scaleLinear([h - yMargin, 10])
    y.domain([0, 100])
    const yAxisTickValues = [...getTicks(0, 100, 2, false)]
    const yAxis = d3.axisLeft().scale(y).tickValues(yAxisTickValues)

    svg.attr('width', w)
      .attr('height', h)
      .append('g')
      .attr('transform', `translate(${xMargin}, ${xMargin})`)

    const $xAxis = svg
      .append('g')
      .attr('transform', `translate(0, ${h - yMargin})`)
      .attr('class', styles.axis)

    const $yAxis = svg
      .append('g')
      .attr('transform', `translate(${xMargin})`)

    svg.append('g')
      .attr('class', styles.grid)
      .call(d3.axisLeft(y).tickValues(yAxisTickValues).tickSize(-w).tickFormat(''))
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

    const $data = svg.append('path').attr('class', `${styles.line} ${styles.color}`)
    $data.datum(data)
      .attr('d', d3.line()
        .x(p => {
          return x(p.closedAt)
        })
        .y((p) => y(p.risk))
      )

    for (let i = 0; i < data.length; i++) {
      const cx = x(data[i].closedAt)
      const cy = y(data[i].risk)
      const circle = svg
        .append('circle')
        .attr('r', 5)
        .attr('class', styles[`color-${getColorFromRisk(data[i])}`])
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('cx', cx)
        .attr('cy', cy)

      circle
        .on('mouseover pointermove', () => { showTooltip(cx, cy, i) })
      circle.on('pointerleave mouseout', () => {
        tooltip.style('opacity', 0)
      })
    }

    function showTooltip (cx, cy, i) {
      // Prepare the tooltip
      const timeString = d3.timeFormat('%H:%M:%S - %b%e, %Y')(data[i].closedAt)
      const risk = data[i].risk || '-'
      const previousRisk = i > 0 ? data[i - 1].risk : '-'

      const calculateVariation = (risk, previousRisk) => {
        if (previousRisk === '-' || risk === '-') {
          return '-'
        }
        const sign = risk > previousRisk ? '+' : '-'
        const variation = Math.round(Math.abs(risk - previousRisk) / previousRisk * 100)
        return `${sign} ${variation}`
      }
      const riskVariation = calculateVariation(risk, previousRisk)

      tooltip.html(`
      <div ${styles.tooltipContainer}>
        <div class="${styles.tooltipTime}">
          <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack} ${styles.time}">${timeString}</div>
        </div>
        <div class="${styles.tooltipTable}">
            <div class="${styles.tooltipLine}">
                <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack} ${typographyStyles.opacity70}">Risk</div>
                <div class="${styles.tooltipValueContainer}">
                <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack} ${styles.tooltipValue}">${risk}</div>
                <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack} ${styles.tooltipUnit}">%</div>
              </div>
            </div>
            <div class="${styles.tooltipLine}">
                <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack} ${typographyStyles.opacity70}">Risk variation</div>
                <div class="${styles.tooltipValueContainer}">
                <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack} ${styles.tooltipValue}">${riskVariation}</div>
                <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.textRichBlack} ${styles.tooltipUnit}">%</div>
              </div>
            </div>
            <div class="${styles.tooltipLine}">
                <div class="${typographyStyles.desktopBodySmallest} ${typographyStyles.opacity70}">Previous Risk</div>
                <div class="${styles.tooltipValueContainer}">
                <div class="${typographyStyles.desktopBodySmallest} ${styles.tooltipValue}">${previousRisk}</div>
                <div class="${typographyStyles.desktopBodySmallest} ${styles.tooltipUnit}">%</div>
              </div>
            </div>
        </div>
      </div>`)
      const tooltipWidth = 160
      const tooltipHeight = 75
      const tx = cx + tooltipWidth < w ? cx : w - tooltipWidth
      const ty = cy - tooltipHeight
      tooltip.style('left', tx + 'px').style('top', ty + 'px')
      tooltip.style('opacity', 1)
    }
  }

  return (
    <BorderedBox classes={styles.closedRiskChartContainer} color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN}>
      <div className={styles.closedRiskChartTitle}>
        <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Risk Variation</p>
        <span className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${typographyStyles.opacity70} `}>(%)</span>
      </div>
      <svg
        ref={setSvgRef} style={{ width: '100%' }}
      />
      <div ref={tooltipRef} className={styles.tooltip} />
    </BorderedBox>
  )
}
export default ClosedRiskChart
