export function getTicks (min, max, count, excludeMax) {
  const step = (max - min) / count
  const retValue = [min]
  for (let i = 1; i < count; i++) {
    retValue.push(min + (i * step))
  }
  if (!excludeMax) {
    retValue.push(max)
  }
  return retValue
}

export function findNextNumberDivisibleBy (source, divisor) {
  if (source < divisor) {
    return divisor
  }

  if (source === divisor) {
    return divisor
  }
  return source + (divisor - (source % divisor))
}

export function getTicksDate (minDate, maxDate, count) {
  const step = (maxDate.getTime() - minDate.getTime()) / count
  const retValue = [minDate.getTime()]
  for (let i = 1; i < count; i++) {
    retValue.push(minDate.getTime() + (i * step))
  }
  retValue.push(maxDate.getTime())
  return retValue
}

export function convertThreadsToArray (threads, serviceId) {
  let output = []
  if (threads[serviceId]) {
    output = Object.keys(threads[serviceId]).map(key => ({ [key]: threads[serviceId][key] }))
  }
  return output
}
