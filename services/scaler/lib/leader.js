'use strict'

const { scheduler } = require('timers/promises')
const { on } = require('events')

function createLeaderElector (options) {
  const {
    db,
    lock,
    poll = 10000,
    channel = 'trigger_scaler',
    log,
    onNotification,
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

  if (!onNotification) {
    throw new Error('onNotification is required')
  }

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
            await t.query(sql.__dangerous__rawValue(`LISTEN "${channel}";`))
            for await (const notification of on(t._driver.client, 'notification', { signal: abortController.signal })) {
              log.debug({ notification }, 'Received notification')
              try {
                const msg = notification[0]
                const payload = msg.payload
                await onNotification(payload)
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

  async function notify (payload) {
    const sql = db.sql
    // Use direct SQL string for NOTIFY since it doesn't support parameters
    await db.query(sql.__dangerous__rawValue(`NOTIFY "${channel}", '${payload}';`))
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
