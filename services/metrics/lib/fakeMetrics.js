'use strict'

const fakeCpuMetrics = []
const random = (min, max) => (
  Math.floor(Math.random() * (max - min)) + min
)
function addFakeCpuMetric (existingData, timeStamp) {
  const randomCpuValue = random(0, 100)
  const randomEventLoopValue = random(0, 1)
  existingData.push({
    date: timeStamp,
    cpu: randomCpuValue,
    eventLoop: randomEventLoopValue
  })
}
function getFakeCpuMetrics (amount) {
  const now = new Date()
  if (fakeCpuMetrics.length === 0) {
    for (let i = 0; i < amount; i++) {
      addFakeCpuMetric(fakeCpuMetrics, now.setSeconds(now.getSeconds() + 5))
    }
  } else {
    fakeCpuMetrics.shift()
    addFakeCpuMetric(fakeCpuMetrics, now.setSeconds(now.getSeconds() + 5))
  }
}
module.exports = {
  getFakeCpuMetrics
}
