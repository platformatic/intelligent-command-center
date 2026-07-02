// CSV loading for the complex and schedule runners, adapted to our model's input shape.
//
// Fixture rows are `day,month,year,dow,value` (complex) or `day,month,year,dow,slot,value`
// (schedule), dow 1..7 (Mon=1). Our model takes a date-anchored series, so we drop the dow column
// (parseWindowDate re-derives the weekday from the real date) and key everything off a UTC Date.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dataLines = (raw) => raw.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))

const dateOf = (year, month, day) => new Date(Date.UTC(year, month - 1, day))

// First non-empty `#` comment line, stripped — the fixture's human label.
export function labelOf (raw) {
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t) continue
    if (!t.startsWith('#')) return ''
    const stripped = t.replace(/^#+\s*/, '').trim()
    if (stripped) return stripped
  }
  return ''
}

// Complex: one value per day → [{ date, value }].
export function loadComplex (dir, n) {
  const historyRaw = readFileSync(join(dir, `${n}.history.csv`), 'utf8')
  const futureRaw = readFileSync(join(dir, `${n}.future.csv`), 'utf8')
  const rows = (raw) => dataLines(raw).map((line) => {
    const [day, month, year, , value] = line.split(',').map(Number)
    return { date: dateOf(year, month, day), value }
  })
  return { label: labelOf(historyRaw), history: rows(historyRaw), future: rows(futureRaw) }
}

// Schedule: 48 slots per day → [{ date, slots: number[] }].
export function loadSchedule (dir, n) {
  const historyRaw = readFileSync(join(dir, `${n}.history.csv`), 'utf8')
  const futureRaw = readFileSync(join(dir, `${n}.future.csv`), 'utf8')
  const days = (raw) => {
    const byDate = new Map()
    const order = []
    for (const line of dataLines(raw)) {
      const [day, month, year, , slot, value] = line.split(',').map(Number)
      const key = `${year}-${month}-${day}`
      let d = byDate.get(key)
      if (!d) { d = { date: dateOf(year, month, day), slots: [] }; byDate.set(key, d); order.push(d) }
      d.slots[slot] = value
    }
    return order
  }
  return { label: labelOf(historyRaw), history: days(historyRaw), future: days(futureRaw) }
}
