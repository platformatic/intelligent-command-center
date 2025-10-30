import callApi from './common'

export function getPods (applicationId) {

}

export async function getScalingHistory (applicationId, limit = 10) {
  const query = new URLSearchParams()
  query.set('where.applicationId.eq', applicationId)
  query.set('orderby.createdAt', 'desc')
  query.set('limit', limit)

  const res = await callApi('scaler', `/scaleEvents?${query.toString()}`)
  // callApi returns true if no results are found, no idea why, but since we don't
  // have tests and this is used in a lot of places, not changing it
  if ((typeof res === 'boolean' && res === true) || res.length === 0) {
    return []
  }

  return res.map((r) => {
    return {
      id: r.id,
      time: r.createdAt,
      values: [r.replicas],
      direction: r.direction,
      reason: r.reason,
      replicasDiff: r.replicasDiff
    }
  })
}

export async function getScalingHistorySummary (applicationId) {
  const query = new URLSearchParams()
  query.set('where.applicationId.eq', applicationId)
  query.set('orderby.createdAt', 'desc')
  query.set('fields', 'direction,createdAt')

  const res = await callApi('scaler', `/scaleEvents?${query.toString()}`)
  if (res.length === 0) {
    return {
      up: 0,
      down: 0,
      latestUp: null,
      latestDown: null
    }
  }

  const output = {
    up: 0,
    down: 0,
    latestUp: null,
    latestDown: null
  }

  for (const event of res) {
    if (event.direction === 'up') {
      output.up++
      if (!output.latestUp || new Date(event.createdAt) > new Date(output.latestUp)) {
        output.latestUp = event.createdAt
      }
    } else if (event.direction === 'down') {
      output.down++
      if (!output.latestDown || new Date(event.createdAt) > new Date(output.latestDown)) {
        output.latestDown = event.createdAt
      }
    }
  }

  return output
}

export async function getScaleEventMetrics (scaleEventId) {
  return callApi('scaler', `/scale-events/${scaleEventId}/metrics`)
}

export async function getAlertMetrics (alertId) {
  return callApi('scaler', `/alerts/${alertId}/metrics`)
}

export async function getPodSignals (applicationId, podId) {
  try {
    // Fetch real alerts data from scaler service for this application and pod
    const alerts = await callApi('scaler', `/alerts?where.applicationId.eq=${applicationId}&where.podId.eq=${podId}&orderby.createdAt=desc&limit=50`, 'GET')

    // Check if alerts is a boolean (callApi returns true when no results)
    if (typeof alerts === 'boolean' || !Array.isArray(alerts)) {
      return { signals: [], applicationId }
    }

    // Transform alerts into signals format
    const signals = alerts.map(alert => {
      // Determine signal type based on alert data
      let type = 'elu'
      // ELU is stored as a decimal value in the database, convert to percentage
      let value = Math.round((alert.elu || 0) * 100)
      const delta = 0 // We don't have historical data to calculate delta

      // If heap usage is significantly high, classify as heap signal
      if (alert.heapUsed && alert.heapTotal && alert.heapUsed / alert.heapTotal > 0.8) {
        type = 'heap'
        value = Math.round(alert.heapUsed / 1024 / 1024) // Convert to MB
      }

      return {
        id: alert.id,
        type,
        value,
        delta,
        createdAt: alert.createdAt,
        scaleEventId: alert.scaleEventId || null, // This will be null if no scaling occurred
        serviceId: alert.serviceId
      }
    }) // Show all signals, not just those that triggered scaling

    return {
      signals: signals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      applicationId
    }
  } catch (error) {
    console.error('Error fetching signals data:', error)
    // Fallback to empty array if API fails
    return { signals: [], applicationId }
  }
}
