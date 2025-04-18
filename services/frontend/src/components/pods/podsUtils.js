import { GOOD_PERFORMANCE, LOW_PERFORMANCE, GREAT_PERFORMANCE, UNKNOWN_PERFORMANCE } from '../../ui-constants'
import { sortCollection, sortPodsByPerformance } from '../../utilitySorting'

export const anyPerformance = pod => pod.performance !== '' || pod.performance === undefined

export const lowPerformance = pod => pod.performance === LOW_PERFORMANCE

export const goodPerformance = pod => pod.performance === GOOD_PERFORMANCE

export const greatPerformance = pod => pod.performance === GREAT_PERFORMANCE

export const unknownPerformance = pod => pod.performance === UNKNOWN_PERFORMANCE

export const newestToOldest = (filteredPods) => sortCollection(filteredPods, 'startTime')

export const oldestToNewest = (filteredPods) => sortCollection(filteredPods, 'startTime', false)

export const bestToWorst = (filteredPods) => sortPodsByPerformance(filteredPods)

export const worstToBest = (filteredPods) => sortPodsByPerformance(filteredPods, false)
