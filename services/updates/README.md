# Updates Manager

This service is used by the UI to subscribe to some topics and receive real-time updates on those topics through a websocket

## Topics

Topic names should follow the React Router URL address because. Here some examples

- All applications page: `ui-updates/applications`
- Application detail page: `ui-updates/applications/123e4567-e89b-12d3-a456-426614174000`
- Recommendations page: `ui-updates/recommendations`
- General system notifications: `ui-updates/system` 

There is no schema for the payload

## Send an update from another service

```js
await request(`http://updates.plt.local/events`, {
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
```