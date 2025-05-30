'use strict'

const checkTrace = (trace, SpanKind) => {
  if (!trace) {
    return false
  }

  // We need every span with a "parentSpanId" to have the parent span,
  // so we collect all the required parentSpanIds and we check that they are all present.
  // We also need every "client" span to have a child span, meaning that if we have a client span which is a parent of a missing span, the trace is not done.
  let rootSpanId = null
  const allSpanIds = new Set()
  const clientSpanIds = new Set()
  const parentSpanIds = []
  const calls = {} // all calls parentSpanId -> childSpanId
  for (const span of trace) {
    if (span.parentSpanId) {
      parentSpanIds.push(span.parentSpanId)
    } else {
      rootSpanId = span.spanId
    }
    allSpanIds.add(span.spanId)
    if (
      span.kind === SpanKind.SPAN_KIND_CLIENT &&
      span.attributes?.['http.cache.hit'] !== 'true'
    ) {
      clientSpanIds.add(span.spanId)
    }
    if (span.kind === SpanKind.SPAN_KIND_SERVER) {
      const clientSpanId = span.parentSpanId
      if (clientSpanId) {
        const parentSpanId = span.spanId || null
        calls[clientSpanId] = parentSpanId
      }
    }
  }
  if (!rootSpanId) {
    // Shortcut: if we don't have a root span, we don't have a full trace
    return {
      isDone: false,
      rootSpanId: null,
      calls: {}
    }
  }

  // Every span with a parentSpanId must have the parent span
  // And all the client spans must be parent of a span. If not, the trace is not done.
  for (const parentSpanId of parentSpanIds) {
    if (!allSpanIds.has(parentSpanId)) {
      // We have a span with an unknown parentSpanId, so the trace is not done
      return {
        isDone: false,
        rootSpanId,
        calls
      }
    }
    if (clientSpanIds.has(parentSpanId)) {
      clientSpanIds.delete(parentSpanId)
    }
  }

  const isDone = clientSpanIds.size === 0
  return {
    isDone,
    rootSpanId,
    calls
  }
}

module.exports = {
  checkTrace
}
