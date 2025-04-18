import React, { useEffect, useState } from 'react'
import styles from './Graph.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import MermaidNodeIngressController from '../taxonomy/MermaidNodeIngressController'
import { renderToStaticMarkup } from 'react-dom/server'
import OptimizedGraph from './OptimizedGraph'
import Service from './graph/Service'
import { ButtonOnlyIcon } from '@platformatic/ui-components'
import { DULLS_BACKGROUND_COLOR, RICH_BLACK, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
export default function Graph ({
  data
}) {
  const MAX_SCALE = '5'
  const BASE_SCALE = '1'
  const MIN_SCALE = '0.5'
  const [diagramScale, setDiagramScale] = useState(BASE_SCALE)
  const [diagramProps, setDiagramProps] = useState({
    transform: `scale(${BASE_SCALE})`
  })
  function refresh () {
    setDiagramScale(BASE_SCALE)
  }
  function zoomIn () {
    setDiagramScale((Number.parseFloat(diagramScale) + 0.5).toFixed(1))
  }

  function zoomOut () {
    setDiagramScale((Number.parseFloat(diagramScale) - 0.5).toFixed(1))
  }
  function serviceHasChanges (name, steps) {
    let output = false
    steps.forEach((s) => {
      if (s.type === 'duplicate-service' && s.targetServiceId.endsWith(name)) {
        output = true
      }
      if (s.type === 'move-service' && s.targetServiceId.endsWith(name)) {
        output = true
      }
    })
    return output
  }
  useEffect(() => {
    setDiagramProps({
      transform: `scale(${diagramScale})`
      // overflow: diagramScale > BASE_SCALE ? 'hidden' : 'auto'
    })
  }, [diagramScale])
  function getLinksBetweenApps (allLinks, mappings) {
    function getAppFromLink (l) {
      const split = l.split(':')
      return split[0]
    }
    const output = {}
    allLinks.forEach((l) => {
      const from = getAppFromLink(l.from)
      const to = getAppFromLink(l.to)
      if (from !== to) {
        const key = `${mappings[from]} --> ${mappings[to]}`
        output[key] = null
      }
    })
    return Object.keys(output)
  }

  function getChart () {
    const ic = renderToStaticMarkup(<MermaidNodeIngressController />)
    const applications = data.apps
    const optSteps = data.steps
    const newApplications = optSteps
      .filter((step) => step.type === 'create-application')
      .map((s) => s.applicationName)
    const entrypoints = []
    const links = []
    const appLinks = []
    const ingressLinks = []
    const subgraphMappings = {}
    const serviceWithChanges = []
    let chartString = ''
    chartString += 'graph LR\n'

    chartString += `
        linkStyle default stroke:white,stroke-width:2px;
        ingress-controller-1(${ic})
        class ingress-controller-1 ingress\n`

    for (const app of applications) {
      let subGraphId = app.name
      if (newApplications.includes(app.name)) {
        subGraphId += '-new'
      }
      subgraphMappings[app.name] = subGraphId
      chartString += `  subgraph ${subGraphId}["${app.name}"]\n`
      chartString += '    direction LR\n'
      for (const s of app.services) {
        const fullServiceName = `${app.name}:${s.name}`
        links.push(...s.links)

        const entrypoint = s.name === 'composer'
        const hasChanges = serviceHasChanges(s.name, optSteps)
        if (hasChanges) {
          serviceWithChanges.push(fullServiceName)
        }
        chartString += `    ${fullServiceName}(${renderToStaticMarkup(<Service isEntrypoint={entrypoint} hasChanges={hasChanges} name={s.name} />)})\n`

        if (entrypoint) {
          entrypoints.push(fullServiceName)
        }
        chartString += `    style ${fullServiceName} fill:none,stroke:none\n`
      }
      chartString += `    class ${app.name} application\n`
      if (newApplications.includes(app.name)) {
        chartString += `    class ${app.name} new\n`
      }
      chartString += '  end\n'
    }

    Object.values(subgraphMappings).forEach((app, idx) => {
      ingressLinks.push(idx)
      chartString += `ingress-controller-1 --> ${app}\n`
    })

    getLinksBetweenApps(links, subgraphMappings).forEach((l, idx) => {
      appLinks.push(ingressLinks.length + idx)
      chartString += `${l}\n`
    })
    if (appLinks.length > 0) {
      chartString += `linkStyle ${appLinks.join(',')} stroke-width:2px,stroke-opacity:1`
    }
    return chartString
  }
  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        <ButtonOnlyIcon
          textClass={typographyStyles.desktopButtonSmall}
          altLabel='Refresh'
          paddingClass={commonStyles.smallButtonSquarePadding}
          color={WHITE}
          backgroundColor={RICH_BLACK}
          onClick={() => refresh()}
          hoverEffect={DULLS_BACKGROUND_COLOR}
          platformaticIcon={{ size: SMALL, iconName: 'RunningIcon', color: WHITE }}
        />
        <ButtonOnlyIcon
          textClass={typographyStyles.desktopButtonSmall}
          altLabel='Zoom out'
          paddingClass={commonStyles.smallButtonSquarePadding}
          color={WHITE}
          backgroundColor={RICH_BLACK}
          onClick={() => zoomOut()}
          hoverEffect={DULLS_BACKGROUND_COLOR}
          platformaticIcon={{ size: SMALL, iconName: 'ZoomOutIcon', color: WHITE }}
          disabled={diagramScale === MIN_SCALE}
        />
        <ButtonOnlyIcon
          textClass={typographyStyles.desktopButtonSmall}
          altLabel='Zoom in '
          paddingClass={commonStyles.smallButtonSquarePadding}
          color={WHITE}
          backgroundColor={RICH_BLACK}
          onClick={() => zoomIn()}
          hoverEffect={DULLS_BACKGROUND_COLOR}
          platformaticIcon={{ size: SMALL, iconName: 'ZoomInIcon', color: WHITE }}
          disabled={diagramScale >= MAX_SCALE}
        />
      </div>
      <div className={styles.graphContainer}>
        <div className={styles.graph} style={{ ...diagramProps }}>
          <OptimizedGraph chart={getChart()} />
        </div>
      </div>

      <div className={styles.legend}>
        <div className={typographyStyles.desktopBodySmallest}><span>Service Changes:</span>
          <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <rect x='0.5' y='0.5' width='11' height='11' rx='1.5' stroke='#2588E4' />
          </svg>
        </div>
        <div className={typographyStyles.desktopBodySmallest}><span>New Applications:</span>
          <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <rect x='0.5' y='0.5' width='11' height='11' rx='1.5' stroke='#21FA90' strokeDasharray='4 4' />
          </svg>
        </div>
      </div>
    </div>
  )
}
