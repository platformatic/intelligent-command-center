'use strict'

async function addInstance (
  store,
  appId,
  controllerId,
  imageId,
  podId,
  instanceId,
  timestamp,
  reconnect = true
) {
  const instances = await store.getAllInstances(appId, controllerId)
  const instance = instances[instanceId]

  if (instance && instance.endTime === 0) {
    await store.setInstance(appId, controllerId, imageId, podId, instanceId, instance.startTime, 0, timestamp)
    return { isNewInstance: false, isNewPod: false }
  }

  // Skip terminated instances if reconnect not allowed (e.g., late batch from metrics)
  if (instance && !reconnect) {
    return { isNewInstance: false, isNewPod: false }
  }

  const startTime = instance ? instance.startTime : timestamp
  await store.setInstance(appId, controllerId, imageId, podId, instanceId, startTime, 0, timestamp)

  if (instance) {
    return { isNewInstance: false, isNewPod: false }
  }

  let isNewPod = true
  for (const id in instances) {
    if (instances[id].podId === podId) {
      isNewPod = false
      break
    }
  }

  return { isNewInstance: true, isNewPod }
}

async function terminateInstance (store, appId, controllerId, instanceId, timestamp, deadTimeout) {
  const instance = await store.getInstance(appId, controllerId, instanceId)
  if (!instance || instance.endTime > 0) return

  const endTime = timestamp + deadTimeout
  await store.setInstance(
    appId,
    controllerId,
    instance.imageId,
    instance.podId,
    instanceId,
    instance.startTime,
    endTime,
    instance.lastSeen
  )
}

async function getClusterState (store, appId, controllerId, now, instancesWindowMs, redeployTimeoutMs) {
  const allInstances = await store.getAllInstances(appId, controllerId)
  const cutoff = now - instancesWindowMs
  const expired = []
  const images = {} // { imageId: { startTime, instances, pods } }

  // Single pass: build everything per image
  for (const [instanceId, instance] of Object.entries(allInstances)) {
    if (instance.endTime > 0 && instance.endTime < cutoff) {
      expired.push(instanceId)
      continue
    }

    // Expire stale instances that haven't reported metrics
    if (instance.endTime === 0 && instance.lastSeen < cutoff) {
      expired.push(instanceId)
      continue
    }

    const imageId = instance.imageId
    let image = images[imageId]

    if (!image) {
      image = { startTime: instance.startTime, instances: {}, pods: {} }
      images[imageId] = image
    } else if (instance.startTime < image.startTime) {
      image.startTime = instance.startTime
    }

    image.instances[instanceId] = instance

    // Aggregate pod data
    const pod = image.pods[instance.podId]
    if (!pod) {
      image.pods[instance.podId] = {
        startTime: instance.startTime,
        endTime: instance.endTime
      }
    } else {
      pod.startTime = Math.min(pod.startTime, instance.startTime)
      if (pod.endTime === 0 || instance.endTime === 0) {
        // Pod is still running
        pod.endTime = 0
      } else {
        // Pod is not running anymore. Chose the latest instance endTime.
        pod.endTime = Math.max(pod.endTime, instance.endTime)
      }
    }
  }

  await store.deleteInstances(appId, controllerId, expired)

  const imageIds = Object.keys(images)

  if (imageIds.length === 0) {
    return { instances: {}, pods: {}, imageId: null, isRedeploying: true }
  }

  if (imageIds.length === 1) {
    const imageId = imageIds[0]
    const image = images[imageId]
    return { instances: image.instances, pods: image.pods, imageId, isRedeploying: false }
  }

  // Find oldest and newest (tiny loop, typically 2 images)
  let newestImageId = null
  let newestImageStartTime = 0
  let oldestImageId = null
  let oldestImageStartTime = Infinity

  for (const id of imageIds) {
    const t = images[id].startTime
    if (t > newestImageStartTime) {
      newestImageId = id
      newestImageStartTime = t
    }
    if (t < oldestImageStartTime) {
      oldestImageId = id
      oldestImageStartTime = t
    }
  }

  const isRedeploying = (now - newestImageStartTime) < redeployTimeoutMs
  const imageId = isRedeploying ? oldestImageId : newestImageId
  const image = images[imageId]

  return { instances: image.instances, pods: image.pods, imageId, isRedeploying }
}

function generatePodsTimeline (pods) {
  const events = []

  for (const [podId, pod] of Object.entries(pods)) {
    events.push({ ts: pod.startTime, delta: +1, podId })
    if (pod.endTime > 0) {
      events.push({ ts: pod.endTime, delta: -1, podId })
    }
  }

  events.sort((a, b) => a.ts - b.ts || b.delta - a.delta)

  const timeline = []
  let count = 0

  for (const event of events) {
    count += event.delta
    timeline.push({ timestamp: event.ts, count })
  }

  return timeline
}

/**
 * Get pods count at a specific timestamp from podsCountHistory.
 */
function getPodsCountAt (timestamp, podsCountHistory) {
  let count = 0
  for (const entry of podsCountHistory) {
    if (entry.timestamp > timestamp) break
    count = entry.count
  }
  return count
}

module.exports = { addInstance, terminateInstance, getClusterState, generatePodsTimeline, getPodsCountAt }
