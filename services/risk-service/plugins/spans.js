'use strict'

const fp = require('fastify-plugin')
const { extractPaths } = require('../lib/paths')
const { checkTrace } = require('../lib/traces')
const { createOperation, getOperationMetadata } = require('../lib/operations')
const { fixGraphQLTrace } = require('../lib/graphql')
const { isHTTP, isDB } = require('../lib/span-attributes')
const { parseDBSpan } = require('../lib/db')
const { collectTraceLatencies } = require('../lib/collect-latencies')

async function plugin (fastify, opts) {
  const { SpanKind } = fastify.messages

  const processResourceSpans = async (resourceSpans, applicationId, ctx) => {
    for (const resourceSpan of resourceSpans) {
      let serviceName = ''
      let version = ''

      for (const attribute of resourceSpan.resource.attributes) {
        // istanbul ignore else
        if (attribute.key === 'service.name') {
          serviceName = attribute.value?.stringValue
        }
        // istanbul ignore next
        if (attribute.key === 'service.version') {
          version = attribute.value?.stringValue
        }
      }

      // We need to proces first the "client" spans, to correctly identify when a trace is done.
      // We collect all the spans for the resource. We don't care about the `scope`, but
      // we collect only the spans which are `SPAN_KIND_SERVER` or `SPAN_KIND_CLIENT` (so involved in HTTP calls) and SPAN_KIND_INTERNAL but only if GraphQL.
      for (const scopeSpan of resourceSpan.scopeSpans) {
        const clientSpans = []
        const serverSpans = []
        const internalGraphQLSpans = []
        const otherSpans = []
        const allSpans = []
        for (const span of scopeSpan.spans) {
          const { kind, startTimeUnixNano, endTimeUnixNano } = span
          const traceId = span.traceId.toString('hex')
          const spanId = span.spanId.toString('hex')
          const parentSpanId = span.parentSpanId?.toString('hex') || null
          const attributes = {}
          for (const attribute of span.attributes) {
            if (attribute.value.stringValue) {
              attributes[attribute.key] = attribute.value.stringValue
            } else if (attribute.value.intValue) {
              attributes[attribute.key] = attribute.value.intValue
            }
          }

          // operation is used by the risk engine to identify the operation
          const operation = createOperation(serviceName, attributes)
          const { isGraphQL, isGraphQLHTTPPost } = getOperationMetadata(attributes)

          const spanData = {
            applicationId,
            traceId,
            spanId,
            parentSpanId,
            serviceName,
            version,
            kind,
            attributes,
            operation,
            isGraphQL,
            isGraphQLHTTPPost,
            startTimeUnixNano,
            endTimeUnixNano
          }

          if (kind === SpanKind.SPAN_KIND_CLIENT && isHTTP(attributes)) {
            clientSpans.push(spanData)
          } else if (kind === SpanKind.SPAN_KIND_SERVER && isHTTP(attributes)) {
            serverSpans.push(spanData)
            // We consider only the internal which are graphql
          } else if (kind === SpanKind.SPAN_KIND_INTERNAL && isGraphQL) {
            internalGraphQLSpans.push(spanData)
          } else if (isDB(attributes)) {
            // We get the columns/table impacted and we save by trace.
            await fastify.store.storeDBSpan(traceId, spanData)
          } else {
            // We are not interested in the other spans, but we need to keep them
            // to track the parent-id relationshipd correctly, so we save them, but
            // we will skip them in the path calculation
            spanData.skipInPath = true
            spanData.operation = `${serviceName}|SKIP`
            otherSpans.push(spanData)
          }
          allSpans.push(spanData)
        }

        const traceIds = new Set()
        // We need to process first the internal, then the client and finally the server.
        // The reason is that the "internal" spans for the same service are completed before the server ones
        // If we process the server one first, we might consider a trace "done" when it's not, so we store them in order
        for (const span of [...internalGraphQLSpans, ...clientSpans, ...serverSpans, ...otherSpans]) {
          const { traceId } = span
          await fastify.store.storeSpan(traceId, span)
          traceIds.add(traceId)
        }

        // Then we check if a trace is done, and if so we process it.
        for (const traceId of traceIds) {
          const trace = await fastify.store.loadTrace(traceId)
          const { isDone, calls, rootSpanId } = checkTrace(trace, SpanKind)

          if (isDone) {
            // We don't remove the trace because it's removed automatically by valkey expire.

            // Fixes the trace to replace the http://POST/graphql span with the graphql://QUERY/xxxx internal ones
            const fixedTrace = fixGraphQLTrace(trace)
            const paths = extractPaths(fixedTrace, SpanKind)

            // Get the DB operations for a given traceId and saves them with the paths.
            // The paths are indeed all the paths involved in the trace, and the DB spans
            // are the query calls involved in the same trace.
            const dbSpans = await fastify.store.loadDBSpans(traceId)
            const dbops = await Promise.all(dbSpans.map(parseDBSpan))
            await fastify.store.storeDBOperations(dbops, paths)

            // We store all the paths in one key (to consider all the forks in the trace).
            // We need to sort it to have consistent keys across different traces with the same paths.
            const sortedPaths = paths.sort()
            const pathsKey = sortedPaths.map((path) => path.join(';')).join(',')
            await fastify.store.incrPath(pathsKey)

            // We get the latencies between services in the trace.
            const latencies = collectTraceLatencies(rootSpanId, fixedTrace, calls)
            await fastify.store.storeLatencies(latencies)

            const cachePaths = extractPaths(fixedTrace, SpanKind, {
              includeCacheAttributes: true
            })
            await fastify.store.storeCachePaths(cachePaths)

            await fastify.saveUrlsRoutes(fixedTrace, SpanKind, ctx)
          }
        }
      }
    }
  }

  fastify.decorate('processResourceSpans', processResourceSpans)
}

module.exports = fp(plugin, {
  name: 'spans',
  dependencies: ['messages', 'store', 'routes']
})
