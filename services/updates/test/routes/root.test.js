'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { getServer } = require('../helper')
const { request } = require('undici')
const { once } = require('node:events')

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
  let received = false

  // prepare to receive the subscription messages
  const subscriptionPromise = new Promise((resolve) => {
    socket.addEventListener('message', (message) => {
      const data = JSON.parse(message.data)
      if (data.command === 'ack') {
        // do nothing
      } else {
        assert.deepStrictEqual(data, {
          topic: 'ui-updates/applications',
          data: {
            foo: 'bar'
          }
        })
        received = true
        resolve(true)
      }
    })
  })

  // subscribe to the topic
  socket.send(JSON.stringify({ command: 'subscribe', topic: 'ui-updates/applications' }))

  // send the event
  await request(`${url}/events`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      topic: 'ui-updates/applications',
      data: {
        foo: 'bar'
      }
    })
  })

  // wait for the subscription messages
  await subscriptionPromise

  // prepare to receive the unsubscription messages
  const unsubscriptionPromise = new Promise((resolve) => {
    socket.addEventListener('message', (message) => {
      const data = JSON.parse(message.data)
      if (data.command === 'ack') {
        socket.close()
        resolve(true)
      } else {
        throw new Error('Unexpected message after unsubscription')
      }
    })
  })

  // unsubscribe from the topic
  socket.send(JSON.stringify({ command: 'unsubscribe', topic: 'ui-updates/applications' }))

  // wait for the unsubscription messages
  await unsubscriptionPromise

  assert.strictEqual(received, true)
})
