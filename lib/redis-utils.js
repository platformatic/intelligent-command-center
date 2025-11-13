'use strict'

/**
 * Scan Redis keys using SCAN command (safe alternative to KEYS)
 * Compatible with AWS ElastiCache Serverless restrictions
 *
 * @param {Object} redis - Redis/Valkey client instance
 * @param {string} pattern - Key pattern to match (e.g., 'prefix:*')
 * @param {number} count - Number of keys to return per iteration (default: 100)
 * @returns {Promise<string[]>} Array of matching keys
 */
async function scanKeys (redis, pattern, count = 100) {
  const keys = []
  let cursor = '0'

  while (true) {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', count)
    keys.push(...batch)
    cursor = nextCursor

    if (cursor === '0') {
      break
    }
  }

  return keys
}

async function flushall (redis) {
  while (true) {
    const [nextCursor, batch] = await redis.scan('0', 'COUNT', 100)
    if (batch.length === 0) break

    if (batch.length > 0) {
      const pipeline = redis.pipeline()
      for (const key of batch) {
        pipeline.del(key)
      }
      await pipeline.exec()
    }

    if (nextCursor === '0') break
  }
}

module.exports = {
  scanKeys,
  flushall
}
