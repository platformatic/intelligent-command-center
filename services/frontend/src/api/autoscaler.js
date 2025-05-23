import callApi from './common'

export function getPods (applicationId) {

}

export async function getScalingHistory (applicationId, limit = 10) {
  const query = new URLSearchParams()
  query.set('where.applicationId.eq', applicationId)
  query.set('orderby.createdAt', 'desc')
  query.set('limit', limit)

  const res = await callApi('scaler', `/controllers?${query.toString()}`)
  if (res.length === 0) {
    return []
  }

  return res.map((r) => {
    return {
      id: r.id,
      time: r.createdAt,
      values: [r.replicas]
    }
  })
}

export async function getScalingHistorySummary (applicationId) {
  const events = await getScalingHistory(applicationId)
  if (events.length === 0) {
    return []
  }
  const output = {
    up: 0,
    down: 0,
    latestUp: null,
    latestDown: null
  }
  let previous = events[0]
  for (let i = 1; i < events.length; i++) {
    const current = events[i]
    if (previous.values[0] > current.values[0]) {
      output.up++
      output.latestUp = current.time
    } else {
      output.down++
      output.latestDown = current.time
    }
    previous = current
  }
  return output
}
