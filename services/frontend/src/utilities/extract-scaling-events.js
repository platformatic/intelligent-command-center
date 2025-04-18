export default function extractScalingEvents (scalingHistory) {
  const chartEvents = scalingHistory.map(({ datetime, description }) => {
    description = description.replace('(combined from similar events):', '')

    if (description.includes('Scaled up replica set')) {
      // "Scaled up replica set to 2 from 1
      description = description.replace('Scaled up replica set', '')
    } else if (description.includes('Scaled down replica set')) {
      description = description.replace('Scaled down replica set', '')
    } else {
      return null
    }

    const [firstPart, from] = description.split('from')
    const to = firstPart.split('to').slice(-1)

    const projected = Number(to)
    const actual = Number(from) || 0

    return {
      datetime,
      actual,
      projected
    }
  }).filter(el => el !== null)
  return chartEvents
}
