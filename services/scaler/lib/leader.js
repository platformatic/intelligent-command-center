'use strict'

const { scheduler } = require('timers/promises')
const { on } = require('events')

function createLeaderElector (options) {
  const {
    db,
    lock,
    poll = 10000,
    channels,
    log,
    onLeadershipChange = null
  } = options

  log.info('Locking scaler to advisory lock %d', lock)

  if (!db) {
    throw new Error('db is required')
  }

  if (!lock) {
    throw new Error('lock is required')
  }

  if (!log) {
    throw new Error('log is required')
  }

  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    throw new Error('channels array is required')
  }

  // Validate channels
  for (const ch of channels) {
    if (!ch.channel) {
      throw new Error('channel is required for each notification channel')
    }
    if (!ch.onNotification) {
      throw new Error('onNotification is required for each notification channel')
    }
  }

  const notificationChannels = channels

  let elected = false
  const abortController = new AbortController()
  let leaderLoop

  // Helper function to update leadership status and trigger callback if needed
  function updateLeadershipStatus (newStatus) {
    if (elected !== newStatus) {
      elected = newStatus
      if (typeof onLeadershipChange === 'function') {
        onLeadershipChange(elected)
      }
    }
  }

  async function amITheLeader () {
    const sql = db.sql
    await db.task(async (t) => {
      while (!abortController.signal.aborted) {
        const [{ leader }] = await t.query(sql`
          SELECT pg_try_advisory_lock(${lock}) as leader;
        `)
        if (leader && !elected) {
          log.info('This instance is the leader')
          updateLeadershipStatus(true)
          ;(async () => {
            // Listen to all configured channels
            for (const ch of notificationChannels) {
              await t.query(sql.__dangerous__rawValue(`LISTEN "${ch.channel}";`))
              log.info({ channel: ch.channel }, 'Listening to notification channel')
            }

            // Process notifications from any channel
            for await (const notification of on(t._driver.client, 'notification', { signal: abortController.signal })) {
              log.debug({ notification }, 'Received notification')
              try {
                const msg = notification[0]
                const payload = JSON.parse(msg.payload)
                const channelName = msg.channel

                // Find the handler for this channel
                const channelConfig = notificationChannels.find(ch => ch.channel === channelName)
                if (channelConfig) {
                  await channelConfig.onNotification(payload)
                } else {
                  log.warn({ channel: channelName }, 'No handler found for notification channel')
                }
              } catch (err) {
                log.warn({ err }, 'error while processing notification')
              }
            }
          })()
            .catch((err) => {
              if (err.name !== 'AbortError') {
                log.error({ err }, 'Error in notification')
              } else {
                abortController.abort()
              }
            })
        } else if (leader && elected) {
          log.debug('This instance is still the leader')
        } else if (!leader && elected) {
          log.warn('This instance was the leader but is not anymore')
          updateLeadershipStatus(false)
        } else {
          log.debug('This instance is not the leader')
        }
        try {
          await scheduler.wait(poll, { signal: abortController.signal })
        } catch {
          break
        }
      }
    })
    log.debug('leader loop stopped')
  }

  function start () {
    leaderLoop = amITheLeader()
    retryLeaderLoop(leaderLoop)
    return leaderLoop
  }

  function retryLeaderLoop (loop) {
    loop.catch((err) => {
      log.error({ err }, 'Error in leader loop')
      elected = false
      return scheduler.wait(1000)
    }).then(() => {
      if (!abortController.signal.aborted) {
        leaderLoop = amITheLeader()
        retryLeaderLoop(leaderLoop)
      }
    })
  }

  async function notify (payload, channelName) {
    if (!channelName) {
      throw new Error('channelName is required')
    }

    payload = JSON.stringify(payload)

    const sql = db.sql
    // Use direct SQL string for NOTIFY since it doesn't support parameters
    await db.query(sql.__dangerous__rawValue(`NOTIFY "${channelName}", '${payload}';`))
  }

  async function stop () {
    abortController.abort()
    if (leaderLoop) {
      await leaderLoop
    }
  }

  function isLeader () {
    return elected
  }

  return {
    start,
    stop,
    notify,
    isLeader
  }
}

module.exports = createLeaderElector
