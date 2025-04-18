export function getCacheDependenciesTreeChart (id, traces = {}, dependents, applications = []) {
  const { services = [], requests = [] } = traces

  if (!services || services.length === 0) {
    return ''
  }
  services.sort().reverse() // to avoid the corner case when an application name is a substing of another application name
  applications.sort((a, b) => a.name.localeCompare(b.name)).reverse()

  const dependentsIds = dependents.map(dependent => dependent.id)

  // collappsing all the requests with the same source, target and method
  // and merging the httpCacheId to avoid duplicates links
  const requestsWithNoDuplicates = {}
  for (const request of requests) {
    // We skip the incoming external links (coming from `X`)
    if (request.sourceTelemetryId === 'X') {
      continue
    }
    const key = `${request.sourceTelemetryId}-${request.targetTelemetryId}-${request.method}`
    if (!requestsWithNoDuplicates[key]) {
      requestsWithNoDuplicates[key] = { ...request }
      requestsWithNoDuplicates[key].httpCacheIds = []
    }
    if (request.httpCacheId) {
      requestsWithNoDuplicates[key].httpCacheIds.push(request.httpCacheId)
    }
  }

  const links = Object.values(requestsWithNoDuplicates).map(request => {
    const req = {
      from: request.sourceTelemetryId,
      to: request.targetTelemetryId,
      httpCacheIds: request.httpCacheId
    }
    for (const httpCacheId of request.httpCacheIds) {
      // We check if it's the cache entry request we are inspecting.
      // If not, we check on the dependents
      if (httpCacheId === id) {
        req.isEntry = true // mark the link as the entry (so blue)
        break
      } else {
        if (dependentsIds.includes(httpCacheId)) {
          req.dependent = true // mark the link as dependent (so yellow)
        }
      }
    }

    return req
  })

  const servicesSet = new Set(services || [])

  for (const application of applications) {
    const servs = [...servicesSet.keys()]
    const servicesInApplication = servs.filter(service => service.startsWith(application.name))
    application.services = servicesInApplication
      .map(service => ({
        id: service,
        name: service.replace(`${application.name}-`, '')
      }))

    for (const service of servicesInApplication) {
      servicesSet.delete(service)
    }
  }

  // The remaining services are external services
  const externalServices = Array.from(servicesSet)

  let chart = `
flowchart LR
  `

  let applicationDirection = 'LR'
  if (applications.length > 3) {
    applicationDirection = 'TB'
  }

  // Application and services
  for (const application of applications) {
    chart += `
subgraph ${application.id}[${application.name}]
  direction ${applicationDirection}`
    for (const service of application.services) {
      chart += `
  ${service.id}[${service.name}]`
    }
    chart += `
end`
  }
  chart += '\n'

  // External services
  for (const service of externalServices) {
    chart += `
${service}[${service}]`
  }

  let entryLinkIndex = null
  const dependenciesLinkIndexes = []
  for (let i = 0; i < links.length; i++) {
    const link = links[i]
    if (link.isEntry) {
      entryLinkIndex = i
    } else if (link.dependent) {
      dependenciesLinkIndexes.push(i)
    }
    chart += `${link.from} --> ${link.to}
`
  }

  chart += `
linkStyle default stroke-width:2px,fill:none,stroke:#fff
`

  if (entryLinkIndex !== null) {
    chart += `linkStyle ${entryLinkIndex} stroke-width:2px,fill:none,stroke:#2588e4
`
  }
  if (dependenciesLinkIndexes.length > 0) {
    chart += `linkStyle ${dependenciesLinkIndexes.join(',')} stroke-width:2px,fill:none,stroke:#feb928
`
  }

  return chart
}

export function getCacheDependenciesWarning (traces = {}, dependents = []) {
  const dependentsIds = dependents.map(dependent => dependent.id)
  const { requests = [] } = traces
  const requestIds = requests.map(request => request.httpCacheId).filter(id => !!id)
  // Show the warning if there is at least one dependents id which is not on the graph
  return dependentsIds.some(dependentId => !requestIds.includes(dependentId))
}
