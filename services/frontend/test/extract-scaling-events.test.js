import { describe, test } from 'node:test'
import assert from 'node:assert'
import extractScalingEvents from '../src/utilities/extract-scaling-events.js'

describe('getPodPerformances', () => {
  test('no events passed', async () => {
    const events = extractScalingEvents([])
    assert.deepEqual(events, [])
  })

  test('scale up events only', async () => {
    const history = [{
      datetime: '2024-10-23T15:45:15Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 1',
      scaleType: 'UP'
    },
    {
      datetime: '2024-10-23T15:45:30Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 2 from 1',
      scaleType: 'UP'
    },
    {
      datetime: '2024-10-23T15:47:00Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 5 from 2',
      scaleType: 'UP'
    }, {
      datetime: '2024-10-23T15:49:16Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 9 from 5',
      scaleType: 'UP'
    },
    {
      datetime: '2024-10-23T15:49:31Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 10 from 9',
      scaleType: 'UP'
    }]

    const events = extractScalingEvents(history)

    const expected = [
      {
        datetime: '2024-10-23T15:45:15Z',
        actual: 0,
        projected: 1
      },
      {
        datetime: '2024-10-23T15:45:30Z',
        actual: 1,
        projected: 2
      },
      {
        datetime: '2024-10-23T15:47:00Z',
        actual: 2,
        projected: 5
      },
      {
        datetime: '2024-10-23T15:49:16Z',
        actual: 5,
        projected: 9
      },
      {
        datetime: '2024-10-23T15:49:31Z',
        actual: 9,
        projected: 10
      }
    ]

    assert.deepEqual(events, expected)
  })

  test('scale up and down events', async () => {
    const history = [{
      datetime: '2024-10-23T15:45:15Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 1',
      scaleType: 'UP'
    },
    {
      datetime: '2024-10-23T15:45:30Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 2 from 1',
      scaleType: 'UP'
    },
    {
      datetime: '2024-10-23T15:47:00Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 5 from 2',
      scaleType: 'UP'
    }, {
      datetime: '2024-10-23T15:49:16Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 9 from 5',
      scaleType: 'UP'
    },
    {
      datetime: '2024-10-23T15:49:31Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 10 from 9',
      scaleType: 'UP'
    },
    {
      datetime: '2024-10-23T15:54:31Z',
      activity: 'Pod removed',
      description: 'Scaled down replica set plt-b9a22420-59bf678b65 to 9 from 10',
      scaleType: 'DOWN'
    },
    {
      datetime: '2024-10-23T15:54:46Z',
      activity: 'Pod removed',
      description: 'Scaled down replica set plt-b9a22420-59bf678b65 to 8 from 9',
      scaleType: 'DOWN'
    }, {
      datetime: '2024-10-23T15:55:01Z',
      activity: 'Pod removed',
      description: 'Scaled down replica set plt-b9a22420-59bf678b65 to 7 from 8',
      scaleType: 'DOWN'
    }, {
      datetime: '2024-10-23T15:55:16Z',
      activity: 'Pod removed',
      description: 'Scaled down replica set plt-b9a22420-59bf678b65 to 6 from 7',
      scaleType: 'DOWN'
    }

    ]

    const events = extractScalingEvents(history)

    const expected = [
      {
        datetime: '2024-10-23T15:45:15Z',
        actual: 0,
        projected: 1
      },
      {
        datetime: '2024-10-23T15:45:30Z',
        actual: 1,
        projected: 2
      },
      {
        datetime: '2024-10-23T15:47:00Z',
        actual: 2,
        projected: 5
      },
      {
        datetime: '2024-10-23T15:49:16Z',
        actual: 5,
        projected: 9
      },
      {
        datetime: '2024-10-23T15:49:31Z',
        actual: 9,
        projected: 10
      },
      {
        datetime: '2024-10-23T15:54:31Z',
        actual: 10,
        projected: 9
      },
      {
        datetime: '2024-10-23T15:54:46Z',
        actual: 9,
        projected: 8
      },
      {
        datetime: '2024-10-23T15:55:01Z',
        actual: 8,
        projected: 7
      },
      {
        datetime: '2024-10-23T15:55:16Z',
        actual: 7,
        projected: 6
      }
    ]

    assert.deepEqual(events, expected)
  })

  test('scale up and down + "combined" event', async () => {
    const history = [{
      datetime: '2024-10-23T15:45:15Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 1',
      scaleType: 'UP'
    },
    {
      datetime: '2024-10-23T15:45:30Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 2 from 1',
      scaleType: 'UP'
    },
    {
      datetime: '2024-10-23T15:47:00Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 5 from 2',
      scaleType: 'UP'
    }, {
      datetime: '2024-10-23T15:49:16Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 9 from 5',
      scaleType: 'UP'
    },
    {
      datetime: '2024-10-23T15:49:31Z',
      activity: 'New pod',
      description: 'Scaled up replica set plt-b9a22420-59bf678b65 to 10 from 9',
      scaleType: 'UP'
    },
    {
      datetime: '2024-10-23T15:54:31Z',
      activity: 'Pod removed',
      description: 'Scaled down replica set plt-b9a22420-59bf678b65 to 9 from 10',
      scaleType: 'DOWN'
    },
    {
      datetime: '2024-10-23T15:54:46Z',
      activity: 'Pod removed',
      description: 'Scaled down replica set plt-b9a22420-59bf678b65 to 8 from 9',
      scaleType: 'DOWN'
    }, {
      datetime: '2024-10-23T15:55:01Z',
      activity: 'Pod removed',
      description: 'Scaled down replica set plt-b9a22420-59bf678b65 to 7 from 8',
      scaleType: 'DOWN'
    }, {
      datetime: '2024-10-23T15:55:16Z',
      activity: 'Pod removed',
      description: 'Scaled down replica set plt-b9a22420-59bf678b65 to 6 from 7',
      scaleType: 'DOWN'
    },
    {
      datetime: '2024-10-23T15:55:31Z',
      activity: 'New pod',
      description: '(combined from similar events): Scaled down replica set plt-b9a22420-59bf678b65 to 5 from 6',
      scaleType: 'UP'
    }
    ]

    const events = extractScalingEvents(history)

    const expected = [
      {
        datetime: '2024-10-23T15:45:15Z',
        actual: 0,
        projected: 1
      },
      {
        datetime: '2024-10-23T15:45:30Z',
        actual: 1,
        projected: 2
      },
      {
        datetime: '2024-10-23T15:47:00Z',
        actual: 2,
        projected: 5
      },
      {
        datetime: '2024-10-23T15:49:16Z',
        actual: 5,
        projected: 9
      },
      {
        datetime: '2024-10-23T15:49:31Z',
        actual: 9,
        projected: 10
      },
      {
        datetime: '2024-10-23T15:54:31Z',
        actual: 10,
        projected: 9
      },
      {
        datetime: '2024-10-23T15:54:46Z',
        actual: 9,
        projected: 8
      },
      {
        datetime: '2024-10-23T15:55:01Z',
        actual: 8,
        projected: 7
      },
      {
        datetime: '2024-10-23T15:55:16Z',
        actual: 7,
        projected: 6
      }, {
        datetime: '2024-10-23T15:55:31Z',
        actual: 6,
        projected: 5
      }
    ]

    assert.deepEqual(events, expected)
  })
})
