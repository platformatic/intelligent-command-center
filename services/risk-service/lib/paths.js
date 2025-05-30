'use strict'

const calculatePaths = (rootSpan, spans, SpanKind) => {
  const children = spans[rootSpan.spanId]
  if (!children) {
    return [[rootSpan]]
  }

  const paths = []
  for (const child of children) {
    const childPaths = calculatePaths(child, spans, SpanKind)
    for (const childPath of childPaths) {
      paths.push([rootSpan, ...childPath])
    }
  }
  return paths
}

function removeFullyContained (paths) {
  const result = []
  for (let i = 0; i < paths.length; i++) {
    let isFullyContained = false
    const currentPath = paths[i]
    const currentPathStr = currentPath.join()
    for (let j = 0; j < paths.length; j++) {
      if (i !== j) {
        if (paths[j].join().startsWith(currentPathStr)) {
          isFullyContained = true
          break
        }
      }
    }
    if (!isFullyContained) {
      result.push(currentPath)
    }
  }
  return result
}

const extractPaths = (trace, SpanKind, opts = {}) => {
  const includeCacheAttributes = opts.includeCacheAttributes || false

  if (!trace) {
    return []
  }
  const spans = {}
  let root = null
  for (const span of trace) {
    if (!span.parentSpanId) {
      root = span
    } else {
      spans[span.parentSpanId] = spans[span.parentSpanId] || []
      spans[span.parentSpanId].push(span)
    }
  }
  if (!root) {
    return []
  }

  // here we:
  // - filter out the spans that should not be part of the path (skipInPath)
  // - extract the operation from the spans
  const spanPaths = calculatePaths(root, spans, SpanKind)
  const operationPaths = []
  for (const spanPath of spanPaths) {
    const operationPath = []
    for (let i = 0; i < spanPath.length; i++) {
      const span = spanPath[i]
      if (span.skipInPath || span.kind !== SpanKind.SPAN_KIND_SERVER) continue

      let operationName = span.operation

      const childSpan = spanPath[i + 1]
      if (includeCacheAttributes && childSpan) {
        if (
          span.kind === SpanKind.SPAN_KIND_SERVER &&
          childSpan.kind === SpanKind.SPAN_KIND_CLIENT
        ) {
          const cacheId = childSpan.attributes['http.cache.id']
          if (cacheId) {
            operationName += `|http.cache.id:${cacheId}`
          }
        }
      }

      operationPath.push(operationName)
    }
    operationPaths.push(operationPath)
  }

  // Here we can have:
  //  A->B
  //  A->B->C
  //  This is because A->B then created other internal span that we discarded.
  //  These are dead branches that we need to remove.
  //  So for each path, if it's contained in another longer span, we remove it
  return removeFullyContained(operationPaths)
}

module.exports = {
  extractPaths
}
