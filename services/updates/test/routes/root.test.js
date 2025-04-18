'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { getServer } = require('../helper')
const { request } = require('undici')
const { once } = require('node:events')
const WebSocket = require('ws')
test('should return 204 when posting an event', async (t) => {
  const server = await getServer(t)
  const res = await server.inject({
    method: 'POST',
    url: '/events',
    body: {
      service: 'test-service',
      data: {
        foo: 'bar'
      }
    }
  })

  assert.strictEqual(res.statusCode, 204)
  assert.deepStrictEqual(res.body, '')
})

test('the event should be sent to the websocket', async (t) => {
  const server = await getServer(t)
  const url = await server.start()

  const wsUrl = url.replace('http', 'ws') + '/ws'

  const socket = new WebSocket(wsUrl)
  await once(socket, 'open')

  t.after(() => {
    socket.close()
  })

  // subscribe to the topic
  socket.send(JSON.stringify({ command: 'subscribe', topic: 'ui-updates/applications' }))

  const subscriptionAck = await once(socket, 'message')
  assert.deepStrictEqual(JSON.parse(subscriptionAck[0]), { command: 'ack' })

  await request(`${url}/events`, {
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
