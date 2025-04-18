import { GREAT_PERFORMANCE, LOW_PERFORMANCE, GOOD_PERFORMANCE } from './ui-constants'

export const sortCollection = (collection, key, ascending = true) => {
  return collection.sort((a, b) => {
    let keyA = a[key]
    let keyB = b[key]
    if (typeof keyB === 'string') {
      keyB = keyB.toUpperCase()
    }
    if (typeof keyA === 'string') {
      keyA = keyA.toUpperCase()
    }

    if (keyA < keyB) {
      return ascending ? -1 : 1
    }
    if (keyA > keyB) {
      return ascending ? 1 : -1
    }
    return 0
  })
}

export const sortCollectionByDate = (collection, key, ascending = true) => {
  return collection.sort((a, b) => {
    const keyA = new Date(a[key])
    const keyB = new Date(b[key])
    if ((keyA instanceof Date && !isNaN(keyA)) && (keyB instanceof Date && !isNaN(keyB))) {
      if (keyA < keyB) {
        return ascending ? -1 : 1
      }
      if (keyA > keyB) {
        return ascending ? 1 : -1
      }
    }
    return 0
  })
}

export const sortPodsByPerformance = (collectionPods, ascending = true) => {
  const newCollectionPod = collectionPods.map(pod => {
    let value = 4
    switch (pod.performance) {
      case GREAT_PERFORMANCE:
        value = 1
        break
      case GOOD_PERFORMANCE:
        value = 2
        break
      case LOW_PERFORMANCE:
        value = 3
        break
      default:
        break
    }

    return {
      ...pod,
      order: value
    }
  })

  return sortCollection(newCollectionPod, 'order', ascending)
}
