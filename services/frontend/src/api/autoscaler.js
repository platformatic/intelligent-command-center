import callApi from './common'

export function getPods (applicationId) {

}

export async function getScalingHistory (applicationId, limit = 10) {
  const query = new URLSearchParams()
  query.set('where.applicationId.eq', applicationId)
  query.set('orderby.createdAt', 'desc')
  query.set('limit', limit)

  const res = await callApi('scaler', `/scaleEvents?${query.toString()}`)
  if (res.length === 0) {
    return []
  }

  return res.map((r) => {
    return {
      id: r.id,
      time: r.createdAt,
      values: [r.replicas],
      direction: r.direction,
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
