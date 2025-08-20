import { ApplicationMap, Cluster, ServiceLinkInput } from './cluster'
import { ServiceTarget } from './service-link'

export interface MermaidInputConfig {
  applications: ApplicationMap
  links: ServiceLinkInput[]
}

/**
 * This reflects the shape of the graph before clustering.
 * All services exist within a single graph, and all paths are unidirectional.
 *
 * @param nodes The nodes in the graph
 * @param paths The paths between nodes
 * @returns A mermaid graph definition
 */
export function mermaidInput (config: MermaidInputConfig): string {
  const { applications, links } = config

  // Start a top-down graph
  let out = 'graph TD\n'

  // Any path with no corresponding client request trace must be from ingress
  if (links.some(link => link.from === undefined)) {
    out += '  ingress[ingress]\n'
  }

  // Any path with no corresponding server request trace must be to egress
  if (links.some(link => link.to === undefined)) {
    out += '  egress[egress]\n'
  }

  // Draw all nodes
  for (const [appName, services] of Object.entries(applications)) {
    out += `  subgraph ${appName}\n`
    for (const { name, costs } of services) {
      const target: ServiceTarget = `${appName}:${name}`
      const attrs = []
      for (const [key, value] of Object.entries(costs)) {
        attrs.push(`${key}: ${value}`)
      }
      const attrStr = attrs.length ? `@{ ${attrs.join(', ')} }` : ''
      out += `    ${id(target)}[${name}]${attrStr}\n`
    }
    out += '  end\n'
  }

  // Draw paths between nodes or ingress/egress
  for (const { from, to, count, average } of links) {
    const fromTarget = from.join(':') as ServiceTarget
    const toTarget = to.join(':') as ServiceTarget
    out += `  ${linkEdge(fromTarget, toTarget, count * average)}\n`
  }

  return out
}

/**
 * This reflects the shape of the graph after clustering.
 * This works both before and after adding composers.
 *
 * @param clusters The clusters of nodes
 * @param paths The paths between nodes
 * @returns A mermaid graph definition
 */
export function mermaidOutput (cluster: Cluster): string {
  let out = 'graph TD\n'

  // Extract all links from the cluster
  const links = Array.from(new Set(cluster.apps.flatMap(app => {
    return app.services.flatMap(service => {
      return service.links
    })
  })))

  // Any path with no corresponding client request trace must be from ingress
  if (links.some(l => !l.services[0])) {
    out += '  ingress[ingress]\n'
  }

  // Any path with no corresponding server request trace must be to egress
  if (links.some(l => !l.services[1])) {
    out += '  egress[egress]\n'
  }

  // Create a subgraph for each cluster of nodes
  for (const app of cluster.apps) {
    out += `  subgraph ${app.name}\n`
    for (const service of app.services) {
      const { target, costs } = service
      const attrs = []
      for (const [key, value] of Object.entries(costs)) {
        attrs.push(`${key}: ${value}`)
      }
      const attrStr = attrs.length ? `@{ ${attrs.join(', ')} }` : ''
      out += `    ${id(target)}[${service.name}]${attrStr}\n`
    }
    out += '  end\n'
  }

  // Draw paths between nodes or ingress/egress
  for (const { services: [from, to], costs } of links) {
    out += `  ${linkEdge(from.target, to.target, costs.cost)}\n`
  }

  return out
}

/*!
 * Mermaid IDs must be alphanumeric with underscores
 *
 * @param name The name to convert to an ID string
 * @returns The ID string
 */
function id (name: string): string {
  return name.replace(/[^a-zA-Z0-9:]/g, '_')
}

/*!
 * Draw a path between two nodes or ingress/egress
 *
 * @param path The service link to draw
 * @returns The mermaid path line
 */
function linkEdge (
  from: ServiceTarget,
  to: ServiceTarget,
  cost: number
): string {
  // If neither from nor to are defined, the path is invalid
  if (!from && !to) {
    throw new Error('Invalid path')
  }

  // If from is not defined, draw a path from ingress to the node
  if (!from) {
    return `ingress -->|${cost}| ${id(to)}`
  }

  // If to is not defined, draw a path from the node to egress
  if (!to) {
    return `${id(from)} -->|${cost}| egress`
  }

  // If both are defined, draw a path between both nodes
  return `${id(from)} -->|${cost}| ${id(to)}`
}
