import { describe, test } from 'node:test'
import assert from 'node:assert'
import { getFormattedDate, getFormattedTimeAndDate, getFormattedLogTimestamp } from '../src/utilities/dates.js'

describe('getFormattedDate', () => {
  test('should print \'-\' for invalid date types', () => {
    const invalidDates = [
      '-',
      'invalid date',
      {},
      [],
      null,
      undefined
    ]
    for (let i = 0; i < invalidDates.length; i++) {
      assert.equal(getFormattedDate(invalidDates[i]), '-')
    }
  })
  test('should print formatted date', (t) => {
    const input = '2024-02-20T09:52:57.858Z'
    const expected = 'Feb 20, 2024'

    assert.equal(getFormattedDate(input), expected)
  })
})

describe('getFormattedTimeAndDate', () => {
  test('should print \'-\' for invalid date types', () => {
    const invalidDates = [
      '-',
      'invalid date',
      {},
      [],
      null,
      undefined
    ]
    for (let i = 0; i < invalidDates.length; i++) {
      assert.equal(getFormattedTimeAndDate(invalidDates[i]), '-')
    }
  })
  test('should print formatted date with time', (t) => {
    const input = '2024-02-20T09:52:57.858Z'
    const expected = '2024-02-20 [09:52:57]'

    assert.equal(getFormattedTimeAndDate(input), expected)
  })
})

describe('getFormattedLogTimestamp', () => {
  test('should print \'-\' for invalid date types', () => {
    const invalidDates = [
      '-',
      'invalid date',
      {},
      [],
      null,
      undefined
    ]
    for (let i = 0; i < invalidDates.length; i++) {
      assert.equal(getFormattedLogTimestamp(invalidDates[i]), '-')
    }
  })
  test('should print formatted time', (t) => {
    const input = '2024-03-20T09:52:57.858Z'
    const expected = '09:52:57'

    assert.equal(getFormattedLogTimestamp(input), expected)
  })

  test('should print formatted time (with milliseconds)', (t) => {
    const input = '2024-03-20T09:52:57.858Z'
    const expected = '09:52:57.858'

    assert.equal(getFormattedLogTimestamp(input, true), expected)
  })
})
