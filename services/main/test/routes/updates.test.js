'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const { once } = require('node:events')
const { request } = require('undici')
const WebSocket = require('ws')
const { getServer } = require('../helper')

test('should return 204 when posting an update', async (t) => {
  const server = await getServer(t)

  const res = await server.inject({
    method: 'POST',
    url: '/api/updates',
    body: {
      service: 'test-service',
      data: {
        foo: 'bar'
      }
    }
  })

  assert.strictEqual(res.statusCode, 204, res.body)
  assert.deepStrictEqual(res.body, '')
})

test('the event should be sent to the websocket', async (t) => {
  const server = await getServer(t)
  const url = await server.start()

  const wsUrl = url.replace('http', 'ws') + '/api/updates/icc'

  const socket = new WebSocket(wsUrl)
  await once(socket, 'open')

  t.after(() => {
    socket.close()
  })

  // subscribe to the topic
  socket.send(JSON.stringify({ command: 'subscribe', topic: 'ui-updates/applications' }))

  const subscriptionAck = await once(socket, 'message')
  assert.deepStrictEqual(JSON.parse(subscriptionAck[0]), { command: 'ack' })

  {
    const { statusCode, body } = await request(`${url}/api/updates`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        topic: 'ui-updates/applications',
        type: 'application-created',
        data: {
          foo: 'bar'
        }
      })
    })
    assert.strictEqual(statusCode, 204, body)
  }

  const notification = await once(socket, 'message')
  const notificationData = JSON.parse(notification[0])
  assert.deepStrictEqual(notificationData, {
    topic: 'ui-updates/applications',
    type: 'application-created',
    data: {
      foo: 'bar'
    }
  })
  // unsubscribe from the topic
  socket.send(JSON.stringify({ command: 'unsubscribe', topic: 'ui-updates/applications' }))
  const unsubscriptionAck = await once(socket, 'message')
  assert.deepStrictEqual(JSON.parse(unsubscriptionAck[0]), { command: 'ack' })
})
