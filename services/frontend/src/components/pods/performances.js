import { UNKNOWN_PERFORMANCE, GOOD_PERFORMANCE, LOW_PERFORMANCE, GREAT_PERFORMANCE } from '../../ui-constants.js'

export const RSS_NO_METRICS = 'No RSS metric'
export const RSS_BETWEEN_80_98 = 'RSS between 80% and 98% of the memory limit'
export const RSS_MORE_THAN_98 = 'RSS more than 98% of the memory limit'

export const HEAP_NO_METRICS = 'No heap metrics'
export const HEAP_LESS_THAN_20 = 'Heap less than 20% of the total heap'
export const HEAP_BETWEEN_20_70 = 'Heap between 20% and 70% of the total heap'
export const HEAP_MORE_THAN_95 = 'Heap more than 95% of the total heap'

export const CPU_NO_METRICS = 'No CPU or Event Loop metrics'
export const CPU_OVERUSED = 'CPU overused: more than 120% while event loop is less than 100%'

export const ELU_NO_METRICS = 'No Event Loop metric'
export const ELU_TOO_HIGH = 'Event Loop more than 95%'

export const isNil = (value) => value === null || value === undefined

// These "score" functions are used to calculate the performance of a pod based on its metrics.
// 0 = great performance, 1 = good performance, 2 = bad performance

const scoreRss = (rss, podMemoryLimit) => {
  if (isNil(rss) || isNil(podMemoryLimit)) {
    return {
      score: -1, // no metrics
      reason: {
        rss,
        podMemoryLimit,
        message: RSS_NO_METRICS
      }
    }
  }

  const rssPerc = (rss / podMemoryLimit) * 100 // RSS in percentage of the memory limit

  if (rssPerc < 80) {
    return {
      score: 0 // GREAT
    }
  }

  if (rssPerc < 98) {
    return {
      score: 1, // GOOD
      reason: {
        rss,
        podMemoryLimit,
        message: RSS_BETWEEN_80_98
      }
    }
  }

  return {
    score: 2, // BAD (> 98% of the memory limit used, POD needs more RAM)
    reason: {
      rss,
      podMemoryLimit,
      message: RSS_MORE_THAN_98
    }
  }
}

const scoreHeap = (usedHeap, totalHeap) => {
  if (isNil(usedHeap) || isNil(totalHeap)) {
    return {
      score: -1, // no metrics
      reason: {
        usedHeap,
        totalHeap,
        message: HEAP_NO_METRICS
      }
    }
  }

  const heapPerc = (usedHeap / totalHeap) * 100

  if (heapPerc < 20) {
    return {
      score: 2, // BAD,  as the app is allocating a lot of memory in big spikes and it takes a long time to clean them up
      reason: {
        usedHeap,
        totalHeap,
        message: HEAP_LESS_THAN_20
      }
    }
  }

  if (heapPerc < 70) {
    return {
      score: 1, // GOOD
      reason: {
        usedHeap,
        totalHeap,
        message: HEAP_BETWEEN_20_70
      }
    }
  }

  if (heapPerc < 95) {
    return {
      score: 0 // GREAT
    }
  }

  return {
    score: 2, // BAD, >90,  out of memory risk
    reason: {
      usedHeap,
      totalHeap,
      message: HEAP_MORE_THAN_95
    }
  }
}

const scoreCpu = (cpu, eventLoop) => {
  if (isNil(cpu) || isNil(eventLoop)) {
    return {
      score: -1, // no metrics
      reason: {
        cpu,
        eventLoop,
        message: CPU_NO_METRICS
      }
    }
  }
  if (cpu > 120 && eventLoop <= 100) {
    return {
      score: 2, // BAD, CPU is overused while the event loop is not used, something is wrong.
      reason: {
        cpu,
        eventLoop,
        message: CPU_OVERUSED
      }
    }
  }
  return {
    score: 0
  }
}

const scoreElu = (eventLoop) => {
  if (isNil(eventLoop)) {
    return {
      score: -1, // no metrics
      reason: {
        eventLoop,
        message: ELU_NO_METRICS
      }
    }
  }
  if (eventLoop > 95) {
    return {
      score: 2, // BAD
      reason: {
        eventLoop,
        message: ELU_TOO_HIGH
      }
    }
  }
  return {
    score: 0
  }
}

export const getPodPerformances = (metrics) => {
  const { rss, totalHeap, usedHeap, podMemoryLimit, cpu, eventLoop } = metrics
  const scores = [
    scoreRss(rss, podMemoryLimit),
    scoreHeap(usedHeap, totalHeap),
    scoreCpu(cpu, eventLoop),
    scoreElu(eventLoop)
  ]

  // Please don't remove this line until we are sure about the rules we want to apply
  // console.log('POD scores', scores)

  // we collect only the reasons for the scores that are not 0
  const reasons = scores.filter((score) => score.score >= 1).map((score) => score.reason)

  const podScore = Math.max(...scores.map((s) => s.score))

  let score = LOW_PERFORMANCE

  if (podScore === -1) {
    score = UNKNOWN_PERFORMANCE
  } else if (podScore === 0) {
    score = GREAT_PERFORMANCE
  } else if (podScore === 1) {
    score = GOOD_PERFORMANCE
  }

  return {
    score,
    reasons
  }
}
