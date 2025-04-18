import PropTypes from 'prop-types'
import React, { useEffect } from 'react'
import styles from './PreviewMermaid.module.css'
import mermaid from 'mermaid'

function PreviewMermaid ({
  chart,
  onLoadSendMermaidSvgDimension = () => {}
}) {
  function initMermaid () {
    mermaid.initialize({
      startOnLoad: false,
      maxTextSize: 1000000,
      theme: 'base',
      themeVariables: {
        primaryColor: 'transparent',
        primaryTextColor: '#fff',
        primaryBorderColor: '#fff',
        lineColor: '#fff',
        secondaryColor: '#fff',
        tertiaryColor: '#fff'
      },
      securityLevel: 'loose',
      themeCSS: `
        g .cluster .cluster-label .nodeLabel  {
          color: white !important;
          font-size: 16px;
          font-weight: 400;
          line-height: 16px;
          opacity: 0.7;
        }
        g .edgePaths .flowchart-link {
          stroke: white;
          stroke-width: 0.7px;
          animation: dash 5s infinite linear forwards;
        }
        g .cluster > rect {
          fill: #00050B;
          stroke: white;
          stroke-width: 1px;
          stroke-opacity: 0.7;
        }
        .marker {
          fill: white;
          stroke: white;
        }
    
        .marker.cross {
          stroke: white;
          stroker-width: 1px;
        }
        .edgePath .path {
          stroke: white;
        }
        @keyframes dash {
          from {
            stroke-dashoffset: +80;
          }
          to {
            stroke-dashoffset: -80;
          }
        }
        .addedServiceClass,
        .editedServiceClass,
        .removedServiceClass,
        .unchangedServiceClass {
          opacity: 0.7;
        }
        .unchangedServiceClass > rect {
          fill: #00050B;
          stroke: #ffffff;
          stroke-width: 1px;
          stroke-opacity: 0.7;
        }
        .removedServiceClass > rect {
          fill: #00050B;
          stroke: #FA2121;
          stroke-width: 1px;
          stroke-opacity: 0.7;
        }
        .removedServiceClass .nodeLabel span {
          color: #FA2121;
        }
        .addedServiceClass > rect {
          fill: #00050B;
          stroke: #21FA90;
          stroke-width: 1px;
          stroke-opacity: 0.7;
        }
        .addedServiceClass .nodeLabel span {
          color: #21FA90;
        }
        .editedServiceClass > rect {
          fill: #00050B;
          stroke: #2588E4;
          stroke-width: 1px;
          stroke-opacity: 0.7;
        }
        .editedServiceClass .nodeLabel span {
          color: #2588E4;
        }
        .ingressControllerContainer {
          display:flex;
          flex-direction: column;
          padding: 2px;
          align-items: start;
          padding: 48px 6px;
        }
        .ingressControllerText {
          color: white;
          font-size: 16px;
          font-weight: 400;
          writing-mode: vertical-rl;
        }
        .serviceType {
          color: white;
          font-size: 12px;
          font-weight: 400;
        }
        .serviceTypeInactive {
          color: white;
          font-size: 12px;
          font-weight: 400;
          opacity: 0.7;
        }
        .serviceDependencyInactive,
        .serviceDependency {
          color: white;
          font-size: 18px;
          font-weight: 400;
          display: flex;
          column-gap: 0.5rem;
        }
        .serviceDependency > span {
          color: white;
        }
        .serviceDependencyInactive> span {
          color: white;
          opacity: 0.7;
        }
        .nodeLabelMargin {
          margin-top: 10px;
        }
      `,
      fontFamily: 'Inter'
    })
  }

  const className = `mermaid ${styles.iccPreviewMermaid}`
  useEffect(() => {
    async function loadMermaid () {
      initMermaid()
      await mermaid.run()
      customAdjustmentMermaid()
      const svg = document.querySelector('div[class*="iccPreviewMermaid"] > svg')
      onLoadSendMermaidSvgDimension(String(svg.getAttribute('viewBox')))
    }
    loadMermaid()

    return () => {
      if (document.getElementById('mermaid')) {
        document.getElementById('mermaid')?.removeAttribute('data-processed')
      }
    }
  }, [])

  function customAdjustmentMermaid () {
    const elements = document.querySelectorAll('g .cluster .cluster-label .nodeLabel')
    elements.forEach(element => element.addEventListener('click', () => window.applicationCallback(element.textContent)))

    const markers = document.querySelectorAll('g marker')
    markers.forEach(marker => marker.setAttribute('markerHeight', 8))

    const clusters = document.querySelectorAll('g .cluster')
    clusters.forEach(cluster => {
      const rectNode = cluster.querySelector('rect')
      const newRect = cluster.querySelector('rect').cloneNode()
      // cluster.querySelector('.cluster-label span.nodeLabel').setAttribute('line-height', '40px')
      cluster.querySelector('.cluster-label foreignObject div').classList.add('nodeLabelMargin')
      cluster.querySelector('.cluster-label foreignObject').setAttribute('height', '40px')
      rectNode.setAttribute('rx', 6)
      rectNode.setAttribute('ry', 6)
      newRect.setAttribute('rx', 6)
      newRect.setAttribute('ry', 6)
      newRect.classList.add('backgroundRect')
      cluster.insertBefore(newRect, rectNode)
    })
  }

  return <div id='mermaid' className={className}>{chart}</div>
}

PreviewMermaid.propTypes = {
  /**
   * chart
    */
  chart: PropTypes.string.isRequired,
  /**
   * onLoadSendMermaidSvgDimension
    */
  onLoadSendMermaidSvgDimension: PropTypes.func
}

export default PreviewMermaid
