import {
  HIGH_REQUEST_AMOUNT,
  MEDIUM_REQUEST_AMOUNT,
  SMALL_REQUEST_AMOUNT,
  SLOW_RESPONSE_TIME,
  MEDIUM_RESPONSE_TIME,
  FAST_RESPONSE_TIME,
  NO_REQUEST_TIME,
  NO_REQUESTS_AMOUNT,
  STATUS_UNCHANGED,
  STATUS_REMOVED,
  STATUS_EDITED,
  STATUS_ADDED,
  RADIX_INGRESS_CONTROLLER
} from '../ui-constants.js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

export function getChartForMermaidFromPreview (taxonomy, addIngressController = false) {
  function getServiceClass (status) {
    return `${status?.toLowerCase() ?? STATUS_UNCHANGED}ServiceClass`
  }

  const classLink = []
  let countIndexLink = 0 // 0 based count of link on mermaid
  const connector = '-->'

  if ((taxonomy?.applications?.length ?? 0) === 0) {
    return ''
  }
  let stringChart = `
    flowchart ${addIngressController ? 'LR' : 'TB'}`

  if (addIngressController) {
    stringChart += `
      ingress-controller-${taxonomy.id}(${taxonomy.html})
      class ingress-controller-${taxonomy.id} ${getServiceClass(STATUS_UNCHANGED)}`
  }

  taxonomy.applications.forEach(application => {
    stringChart += `
      subgraph ${application.id}[${application.name}]
      direction TB`
    application.services.forEach((service) => {
      stringChart += `
        ${application.id}!${service.id}(${service.html})
        class ${application.id}!${service.id} ${getServiceClass(service.status)}`
    })
    stringChart += `
      end`
  })
  if (taxonomy.links.length > 0) {
    taxonomy.links.forEach(link => {
      classLink.splice(0, classLink.length)

      switch (link.status) {
        case STATUS_REMOVED:
          classLink.push('stroke:#FA2121')
          classLink.push('stroke-width:1px')
          break
        case STATUS_EDITED:
          classLink.push('stroke:#2588E4')
          classLink.push('stroke-width:1px')
          break
        case STATUS_ADDED:
          classLink.push('stroke:#21FA90')
          classLink.push('stroke-width:1px')
          break
        default:
          break
      }

      if (link.source === RADIX_INGRESS_CONTROLLER) {
        stringChart += `
      ${link.applicationSourceId} ${connector} ${link.applicationTargetId}!${link.target}`
      } else {
        stringChart += `
      ${link.applicationSourceId}!${link.source} ${connector} ${link.applicationTargetId}!${link.target}`
      }

      if (classLink.length > 0) {
        stringChart += `
      linkStyle ${countIndexLink} ${classLink.join(',')}`
      }
      countIndexLink++
    })
  }
  return stringChart
}

export function getChartForMermaidFromTaxonomy (taxonomy, addIngressController = false) {
  const classLink = []
  let countIndexLink = 0 // 0 based count of link on mermaid
  let connector = ''
  if ((taxonomy?.applications?.length ?? 0) === 0) {
    return ''
  }
  let stringChart = `
    flowchart ${addIngressController ? 'LR' : 'TB'}`

  if (addIngressController) {
    stringChart += `
      ingress-controller-${taxonomy.id}(${taxonomy.html})
      class ingress-controller-${taxonomy.id} ingressClassActive
      click ingress-controller-${taxonomy.id} ingressControllerCallback`
  }

  taxonomy.applications.forEach(application => {
    stringChart += `
      subgraph ${application.id}[${application.name}]
      click ${application.id} applicationCallback
      direction TB`
    application.services.forEach((service) => {
      stringChart += `
        ${application.id}!${service.id}(${service.html})
        click ${application.id}!${service.id} serviceCallback
        class ${application.id}!${service.id} serviceClassActive`
    })
    stringChart += `
      end`
  })
  if (taxonomy.links.length > 0) {
    taxonomy.links.forEach(link => {
      classLink.splice(0, classLink.length)
      switch (link.responseTime) {
        case SLOW_RESPONSE_TIME:
          classLink.push('stroke:#FA2121')
          classLink.push('stroke-width:1px')
          break
        case MEDIUM_RESPONSE_TIME:
          classLink.push('stroke:#FEB928')
          classLink.push('stroke-width:1px')
          break
        case FAST_RESPONSE_TIME:
          classLink.push('stroke:#21FA90')
          classLink.push('stroke-width:1px')
          break
        default:
          connector = '-->'
          break
      }
      switch (link.requestsAmount) {
        case SMALL_REQUEST_AMOUNT:
          connector = '-.->'
          classLink.push('stroke-dasharray:12 12')
          break
        case MEDIUM_REQUEST_AMOUNT:
          connector = '-->'
          classLink.push('stroke-dasharray:6 6')
          break
        case HIGH_REQUEST_AMOUNT:
          connector = '==>'
          classLink.push('stroke-dasharray:2 2')
          break
        default:
          connector = '-->'
          break
      }

      if (link.source === RADIX_INGRESS_CONTROLLER) {
        stringChart += `
      ${link.applicationSourceId} ${connector} ${link.applicationTargetId}!${link.target}`
      } else {
        stringChart += `
      ${link.applicationSourceId}!${link.source} ${connector} ${link.applicationTargetId}!${link.target}`
      }

      if (classLink.length > 0) {
        stringChart += `
      linkStyle ${countIndexLink} ${classLink.join(',')}`
      }
      countIndexLink++
    })
  }
  return stringChart
}

export function getGroupedTaxonomyGeneration (taxonomyGenerations, today = new Date()) {
  const collectionVersions = taxonomyGenerations.reduce((acc, current) => {
    let groupName = ''
    const currentGenerationDate = dayjs.utc(current.createdAt)
    if (currentGenerationDate.isSame(today, 'day')) {
      groupName = 'today'
    } else {
      groupName = currentGenerationDate.format('MMM YYYY')
    }
    const currentDate = currentGenerationDate.format('MMM DD, YYYY')
    const currentTime = currentGenerationDate.format('hh:mm A')
    if (acc[groupName]) {
      const foundElement = acc[groupName].find(group => group.label === currentDate)
      if (foundElement) {
        foundElement.elements.push({
          label: currentTime,
          id: current.id
        })
      } else {
        acc[groupName].push({
          label: currentDate,
          elements: [{
            label: currentTime,
            id: current.id
          }]
        })
      }
    } else {
      acc[groupName] = [{
        label: currentDate,
        elements: [{
          label: currentTime,
          id: current.id
        }]
      }]
    }
    return acc
  }, {})

  return collectionVersions
}

export function getLinksForTaxonomyGraph (links = [], applications = [], taxonomyId) {
  if (!Array.isArray(links) || links.length === 0) {
    return []
  }

  let updatedLinks = []
  let applicationTarget = null
  let applicationTargetEntrypoint = null
  let applicationSourceId = null
  let source = null
  updatedLinks = links.map(link => {
    if (link.source.applicationId === link.target.applicationId || (link.source.applicationId === null && link.source.serviceId === null && link.source.telemetryId === 'X')) {
      applicationSourceId = link.source.applicationId
      source = link.source.serviceId

      if (link.source.applicationId === null && link.source.serviceId === null && link.source.telemetryId === 'X') {
        applicationSourceId = `${RADIX_INGRESS_CONTROLLER}-${taxonomyId}`
        source = RADIX_INGRESS_CONTROLLER
      }

      return {
        applicationSourceId,
        source,
        applicationTargetId: link.target.applicationId,
        target: link.target.serviceId,
        responseTime: (link?.responseTime ?? 0) === 0 ? NO_REQUEST_TIME : link.responseTime,
        requestsAmount: (link?.requestsAmount ?? 0) === 0 ? NO_REQUESTS_AMOUNT : link.requestsAmount
      }
    }

    if (!Array.isArray(applications) || applications.length === 0) {
      return undefined
    }

    applicationTarget = applications.find(application => application.id === link.target.applicationId)
    if (applicationTarget) {
      applicationTargetEntrypoint = applicationTarget.services.find(service => service.entrypoint)
      if (applicationTargetEntrypoint) {
        return {
          applicationSourceId: link.source.applicationId,
          source: link.source.serviceId,
          applicationTargetId: link.target.applicationId,
          target: applicationTargetEntrypoint.id,
          responseTime: (link?.responseTime ?? 0) === 0 ? NO_REQUEST_TIME : link.responseTime,
          requestsAmount: (link?.requestsAmount ?? 0) === 0 ? NO_REQUESTS_AMOUNT : link.requestsAmount
        }
      }
    }
    return undefined
  })

  return updatedLinks.filter(link => !!link)
}

export function getLinksForPreviewGraph (links = [], applications = [], taxonomyId) {
  if (!Array.isArray(links) || links.length === 0) {
    return []
  }

  let updatedLinks = []
  let applicationTarget = null
  let applicationTargetEntrypoint = null
  let applicationSourceId = null
  let source = null
  updatedLinks = links.map(link => {
    if (link.source.applicationId === link.target.applicationId || (link.source.applicationId === null && link.source.serviceId === null && link.source.telemetryId === 'X')) {
      applicationSourceId = link.source.applicationId
      source = link.source.serviceId

      if (link.source.applicationId === null && link.source.serviceId === null && link.source.telemetryId === 'X') {
        applicationSourceId = `${RADIX_INGRESS_CONTROLLER}-${taxonomyId}`
        source = RADIX_INGRESS_CONTROLLER
      }

      return {
        applicationSourceId,
        source,
        url: link.target?.url || '',
        applicationTargetId: link.target.applicationId,
        target: link.target.serviceId,
        responseTime: (link?.responseTime ?? 0) === 0 ? NO_REQUEST_TIME : link.responseTime,
        requestsAmount: (link?.requestsAmount ?? 0) === 0 ? NO_REQUESTS_AMOUNT : link.requestsAmount,
        status: link.status
      }
    }

    if (!Array.isArray(applications) || applications.length === 0) {
      return undefined
    }

    applicationTarget = applications.find(application => application.id === link.target.applicationId)
    if (applicationTarget) {
      applicationTargetEntrypoint = applicationTarget.services.find(service => service.entrypoint)
      if (applicationTargetEntrypoint) {
        return {
          applicationSourceId: link.source.applicationId,
          source: link.source.serviceId,
          url: link.target?.url || '',
          applicationTargetId: link.target.applicationId,
          target: applicationTargetEntrypoint.id,
          responseTime: (link?.responseTime ?? 0) === 0 ? NO_REQUEST_TIME : link.responseTime,
          requestsAmount: (link?.requestsAmount ?? 0) === 0 ? NO_REQUESTS_AMOUNT : link.requestsAmount,
          status: link.status
        }
      }
    }
    return undefined
  })

  return updatedLinks.filter(link => !!link)
}

export function getServicesAddedEditedRemoved (applications = []) {
  const removed = []
  const added = []
  const edited = []

  if (!Array.isArray(applications) || applications.length === 0) {
    return { removed, added, edited }
  }

  // REMOVED
  // Services on main taxonomy and not on the preview
  for (const application of applications) {
    for (const service of application.services) {
      switch (service.status) {
        case 'edited':
          edited.push({
            ...service,
            applicationId: application.id,
            applicationName: application.name
          })
          break
        case 'added':
          added.push({
            ...service,
            applicationId: application.id,
            applicationName: application.name
          })
          break
        case 'removed':
          removed.push({
            ...service,
            applicationId: application.id,
            applicationName: application.name
          })
          break
        default:
          break
      }
    }
  }

  return { removed, added, edited }
}
