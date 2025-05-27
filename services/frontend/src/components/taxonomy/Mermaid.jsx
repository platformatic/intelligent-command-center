import React, { useEffect } from 'react'
import styles from './Mermaid.module.css'
import mermaid from 'mermaid'

function Mermaid ({
  chart,
  onClickService = () => {},
  onClickApplication = () => {},
  onClickIngressController = () => {},
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
          color: white;
          font-size: 14px;
          font-weight: 400;
          line-height: 14px;
          cursor: pointer;
        }
        g .cluster:hover  {
          cursor: pointer;
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
        g .cluster.applicationSelected > :not(rect.backgroundRect),
        g .cluster:hover > :not(rect.backgroundRect) {
          fill-opacity: 0.3;
          fill: white;
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
        .ingressClassActive > :not(rect.backgroundRect),
        .serviceClassActive > rect {
          fill: #00050B;
          stroke: #ffffff;
          stroke-width: 1px;
          stroke-opacity: 0.7;
          border-radius: 2px;
        }
        
        .ingressControllerClassSelected > rect.backgroundRect,
        .ingressClassActive:hover > rect.backgroundRect {
          fill: #00050B !important; 
        }
        
        .ingressControllerClassSelected > :not(rect.backgroundRect),
        .serviceClassSelected > rect,
        .ingressClassActive:hover > :not(rect.backgroundRect),
        .serviceClassActive:hover > rect {
          fill: white;
          fill-opacity: 0.3;
          stroke-opacity: 1;
        }
        .serviceClassInactive > rect {
          fill: #00050B;
          stroke: #ffffff;
          stroke-width: 0.7px;
          stroke-opacity: 0.3;
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
          font-size: 14px;
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
          -moz-opacity: 0.5;
          -webkit-opacity: 0.5
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
          -moz-opacity: 0.5;
          -webkit-opacity: 0.5
        }
        .nodeLabelMargin {
          margin-top: 10px;
        }
      `,
      fontFamily: 'Inter'
    })
  }

  window.serviceCallback = async function (id) {
    onClickService(id)
  }
  window.applicationCallback = async function (name) {
    onClickApplication(name)
  }
  window.ingressControllerCallback = async function (id) {
    onClickIngressController(id)
  }
  const className = `mermaid ${styles.iccMermaid}`
  useEffect(() => {
    async function loadMermaid () {
      initMermaid()
      await mermaid.run()
      customAdjustmentMermaid()
      const svg = document.querySelector('div[class*="iccMermaid"] > svg')
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
    const elements = document.querySelectorAll('g .cluster')
    elements.forEach(element => element.addEventListener('click', () => window.applicationCallback(element.querySelector('.cluster-label .nodeLabel').textContent)))

    const markers = document.querySelectorAll('g marker')
    markers.forEach(marker => marker.setAttribute('markerHeight', 8))

    const clusters = document.querySelectorAll('g .cluster')
    clusters.forEach(cluster => {
      const rectNode = cluster.querySelector('rect')
      const newRect = cluster.querySelector('rect').cloneNode()
      // cluster.querySelector('.cluster-label span.nodeLabel').setAttribute('line-height', '40px')
      cluster.querySelector('.cluster-label foreignObject div').classList.add('nodeLabelMargin')
      cluster.querySelector('.cluster-label foreignObject').setAttribute('height', '40px')
      rectNode.setAttribute('rx', 4)
      rectNode.setAttribute('ry', 4)
      newRect.setAttribute('rx', 4)
      newRect.setAttribute('ry', 4)
      newRect.classList.add('backgroundRect')
      cluster.insertBefore(newRect, rectNode)
    })

    const serviceClassActive = document.querySelectorAll('g .serviceClassActive')
    serviceClassActive.forEach(service => {
      const rectNode = service.querySelector('rect')
      rectNode.setAttribute('rx', 2)
      rectNode.setAttribute('ry', 2)
    })

    const ingressClassActive = document.querySelectorAll('g .ingressClassActive')
    ingressClassActive.forEach(ingress => {
      const rectNode = ingress.querySelector('rect')
      const newRect = ingress.querySelector('rect').cloneNode()
      newRect.classList.add('backgroundRect')
      ingress.insertBefore(newRect, rectNode)
    })
  }

  return <div id='mermaid' className={className}>{chart}</div>
}

export default Mermaid
