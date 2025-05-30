'use strict'

// When we have a service using graphql, we have TWO spans in the trace:
// - one (server and parent) for the POST /graphql
// - one (child) for the actual graphql query
// Since the risk engine is not interested in the POST /graphql, we need to remove it, and replace with the internal one, considering it as the real "server" asnwering to the client
const fixGraphQLTrace = (trace) => {
  const internalGraphQLSpans = {}
  for (const span of trace) {
    if (span.isGraphQL) {
      if (!internalGraphQLSpans[span.parentSpanId]) {
        internalGraphQLSpans[span.parentSpanId] = []
      }
      internalGraphQLSpans[span.parentSpanId].push(span)
    }
  }
  const filteredTrace = []
  for (const span of trace) {
    const internalGraphQLSpan = internalGraphQLSpans[span.spanId]
    if (span.isGraphQLHTTPPost && internalGraphQLSpan) {
      for (const internalSpan of internalGraphQLSpan) {
        // For each internal span (the graphql query), we create a new span
        // we replace the http://POST/graphql span with the graphql://QUERY/xxxx internal one
        // we need to copy the parentSpanId and kind from the original span, so
        // the risk engine can correctly identify the paths
        internalSpan.parentSpanId = span.parentSpanId
        internalSpan.kind = span.kind
        filteredTrace.push(internalSpan)
      }
    } else if (!span.isGraphQL) {
      filteredTrace.push(span)
    }
  }
  return filteredTrace
}

module.exports = {
  fixGraphQLTrace
}
