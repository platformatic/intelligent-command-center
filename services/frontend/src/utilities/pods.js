export const CONFIGURATION_5 = 5
const CONFIGURATION_7 = 7
const CONFIGURATION_14 = 14
const CONFIGURATION_30 = 30
const CONFIGURATION_31 = 31

export const configurationRowsBasedOnLenghtPods = {
  5: [5],
  7: [7],
  14: [7, 7],
  30: [10, 10, 10],
  31: [15, 15, 15]
}

export function groupFilteredPods (filteredPods, configurationPassedRow = 7) {
  if (filteredPods.length === 0) return []
  const acc = []
  const tmp = []
  const configurationRow = configurationRowsBasedOnLenghtPods[configurationPassedRow]
  let indexFilteredPods = 0
  configurationRow.forEach((numberElements) => {
    tmp.splice(0, tmp.length)
    Array.from(new Array(numberElements).keys()).forEach(index => {
      if (indexFilteredPods > (filteredPods.length - 1)) {
        const lastId = filteredPods[filteredPods.length - 1].id
        tmp.push({ id: `${lastId}-clone-${index}`, fillingType: true })
      } else {
        tmp.push(filteredPods[indexFilteredPods])
        indexFilteredPods++
      }
    })
    acc.push([...tmp])
  })
  return acc
}

export function getConfigurationRow (podsLength) {
  if (podsLength > 5 && podsLength <= 7) {
    return CONFIGURATION_7
  }
  if (podsLength > 7 && podsLength <= 14) {
    return CONFIGURATION_14
  }
  if (podsLength > 14 && podsLength <= 30) {
    return CONFIGURATION_30
  }
  if (podsLength > 30) {
    return CONFIGURATION_31
  }
  return CONFIGURATION_5
}

export function getMaxConfigurationRow (configurationPassedRow) {
  const ar = configurationRowsBasedOnLenghtPods[configurationPassedRow] || []
  return Math.max(...ar)
}
