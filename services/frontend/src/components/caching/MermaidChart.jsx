import React, { useEffect } from 'react'
import styles from './MermaidChart.module.css'
import mermaid from 'mermaid'

function MermaidChart ({
  chart
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
          line-height: 36px;
          cursor: pointer;
        }
 
 
        g .cluster > rect {
          fill: transparent;
          stroke: white;
          stroke-width: 1px;
          stroke-opacity: 0.5;
          stroke-dasharray: 8, 12;
        }
  
        .marker {
          fill: context-stroke;
          stroke: context-stroke;
        }
    
        .marker.cross {
          stroke: context-stroke;
          stroker-width: 1px;
        }

        .serviceClassActive > rect {
          fill: #00050B;
          stroke: #ffffff;
          stroke-width: 1px;
          stroke-opacity: 0.7;
          border-radius: 2px;
        }

      `,
      fontFamily: 'Inter'
    })
  }

  const className = `mermaid ${styles.iccMermaid}`
  useEffect(() => {
    async function loadMermaid () {
      initMermaid()
      await mermaid.run()
      customAdjustmentMermaid()
    }
    loadMermaid()

    return () => {
      if (document.getElementById('mermaid')) {
        document.getElementById('mermaid').removeAttribute('data-processed')
      }
    }
  }, [])

  function customAdjustmentMermaid () {
    // Arrow dimension / styling
    const markers = document.querySelectorAll('g marker')
    markers.forEach(marker => marker.setAttribute('markerHeight', 6))
  }

  return <div id='mermaid' className={className}>{chart}</div>
}

export default MermaidChart
