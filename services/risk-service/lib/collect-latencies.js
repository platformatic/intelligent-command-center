'use strict'

const calculateSpanTimeMillis = (span) => {
  return (span.endTimeUnixNano - span.startTimeUnixNano) / 1e6
}

// The "latency" is calculated in millis considering these two cases:
// - The caller is ingress => is endTime - startTime of the server side of the span.
// - All the other cases: client side of the span.
// All these numebrs are in milliseconds and are calcualted as means, saving the number of values
// from which the mean is calculated.
// We need to do that because we will save different "genrations" of data, and if we want to calculate
// a "global" average, we need to consider the number of values used to calculate the means.
const collectTraceLatencies = (rootSpanId, trace, calls) => {
  const spans = {}
  for (const span of trace.filter(span => !span.skipInPath)) {
    spans[span.spanId] = span
  }

  // const latencies = {
  //   `${from}||${to}`:  [1212, 2323] // array of latencies in millis for that trace
  // }
  const latencies = {}

  // root span:
  const rootSpan = spans[rootSpanId]
  if (rootSpan) {
    const time = calculateSpanTimeMillis(rootSpan)
    const rootKey = `||${rootSpan.serviceName}`
    latencies[rootKey] = time ? [time] : []
  }

  // ...all the others
  for (const span of Object.values(spans)) {
    const calledSpanId = calls[span.spanId]
    const calledSpan = spans[calledSpanId]
    const callingSpan = spans[span.spanId]
    if (callingSpan && calledSpan) {
      const from = `${callingSpan.applicationId}__${callingSpan.serviceName}`
      const to = `${calledSpan.applicationId}__${calledSpan.serviceName}`
      const key = `${from}||${to}`
      if (!latencies[key]) {
        latencies[key] = []
      }
      const time = calculateSpanTimeMillis(callingSpan)
      if (time) {
        latencies[key].push(time)
      }
    }
  }

  return latencies
}

module.exports = { collectTraceLatencies }
