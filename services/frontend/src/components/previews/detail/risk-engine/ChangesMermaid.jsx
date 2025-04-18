import React, { useEffect } from 'react'
import styles from './ChangesMermaid.module.css'
import mermaid from 'mermaid'

function ChangesMermaid ({ chart }) {
  function initMermaid () {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryTextColor: '#fff',
        primaryColor: '#082B1C',
        primaryBorderColor: '#21F190',
        secondaryColor: '#2A2B2C',
        secondaryBorderColor: '#21F190',
        lineColor: '#FEB928'
      },
      securityLevel: 'loose',
      fontFamily: 'Inter'
    })
  }

  const className = `mermaid ${styles.iccMermaid}`
  useEffect(() => {
    async function loadMermaid () {
      initMermaid()
      await mermaid.run()
      return () => {}
    }
    loadMermaid()
  }, [])

  return <div className={className}>{chart}</div>
}

export default ChangesMermaid
