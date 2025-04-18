import React, { useEffect } from 'react'
import styles from './OptimizedGraph.module.css'
import mermaid from 'mermaid'
export default function OptimizedGraph ({
  chart
}) {
  function initMermaid () {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      look: 'classic',
      flowchart: {
        padding: 1,
        curve: 'basis',
        subGraphTitleMargin: {
          top: 15,
          bottom: 15
        },
        nodeSpacing: 20
      },
      themeCSS: `
      g.root g.clusters g.cluster > rect {
        fill: none;
        stroke-width: 2px;
        stroke-dasharray: 10;
      }
      g.cluster-label p {
        color: #ffffff;
      }
      g.nodes g.node.default path,
      g.nodes g.node.default circle {
        fill: none;
        stroke: none;
      }

      g.nodes g.node.default.ingress > rect {
        fill: none;
        stroke: white;
      
      }
      g.nodes g.root g.clusters g.cluster span.nodeLabel {
        color: #ffffff;
      }

      .marker {
        stroke: #ffffff;
        fill: #ffffff;
        stroke-width: 2px;
      }

      g[id$="-new"] > rect {
        stroke: #21FA90;
      }

      g.edgePaths > path {
        stroke-opacity: 0.4;
      }
      `
    })
  }

  useEffect(() => {
    async function loadMermaid () {
      initMermaid()
      await mermaid.run()
    }
    loadMermaid()
    return () => {
      if (document.getElementById('mermaid')) {
        document.getElementById('mermaid')?.removeAttribute('data-processed')
        delete window.ingressControllerCallback
      }
    }
  }, [])
  const className = `mermaid ${styles.iccMermaid}`
  return <div id='mermaid' className={className}>{chart}</div>
}
