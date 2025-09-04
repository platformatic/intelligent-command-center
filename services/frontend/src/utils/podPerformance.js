// Shared pod performance calculation logic for hexagon display
// These are Platformatic defaults - we might want to tune them in the future
// TODO: Make thresholds configurable per application
const ELU_THRESHOLD = 99 // 99% for ELU
const HEAP_THRESHOLD = 99 // 99% for Heap usage

export function calculateHexagonPerformance (podData) {
  const { eventLoop = 0, usedHeap = 0, totalHeap = 0 } = podData

  // Handle null/undefined values
  // ELU values from API are in decimal form (0-1), convert to percentage for comparison
  const eluPercent = eventLoop > 1 ? eventLoop : eventLoop * 100
  const eluPerformance = eluPercent < ELU_THRESHOLD ? 'good' : 'low'

  // Handle heap performance
  let heapPerformance = 'good'
  if (totalHeap > 0) {
    const heapRatio = usedHeap / totalHeap
    heapPerformance = heapRatio < (HEAP_THRESHOLD / 100) ? 'good' : 'low'
  } else if (usedHeap === 0 && totalHeap === 0) {
    // Both zero means no data - consider good performance
    heapPerformance = 'good'
  } else {
    // Other edge cases - be conservative
    heapPerformance = 'low'
  }

  // Return combined performance
  return eluPerformance === 'good' && heapPerformance === 'good' ? 'good' : 'low'
}

export { ELU_THRESHOLD, HEAP_THRESHOLD }
