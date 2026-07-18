export const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`)

export function formatDate (date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${mm}-${dd}-${date.getFullYear()}`
}

export function addDays (date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function sameDay (a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export function isoWeekStart (date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

// Groups raw timeWindowStats/timeWindowPredictions records into the DayEntry
// shape the calendar expects: { date: 'MM-DD-YYYY', instances: [{ time, history?, predictions?, scheduled }] }
// slotStart is UTC, and PlannerColumn already treats hour keys as UTC hours.
// timeWindowStats slots are hourly (pods); timeWindowPredictions slots are
// 15-minute (predictedPods) — only the on-the-hour slot is kept so both line
// up with the calendar's hourly grid.
// When both history and predictions exist for a slot, they're merged into one cell.
//
// `scheduled` is the resolved floor per slot (GET /applications/:id/scheduled) — the accepted
// suggestions after most-specific-wins resolution. A future slot that has one is drawn as SCHEDULED
// instead of as a forecast: the floor comes straight out of the same prediction, so it replaces the
// predicted value rather than competing with it.
export function groupTimeWindowStats (stats, scheduled = []) {
  const byDate = new Map()
  const bySlot = new Map()

  const keyOf = (slotStart) => {
    const slot = new Date(slotStart)
    if (slot.getUTCMinutes() !== 0) return null
    const mm = String(slot.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(slot.getUTCDate()).padStart(2, '0')
    const date = `${mm}-${dd}-${slot.getUTCFullYear()}`
    return { date, time: `${slot.getUTCHours()}:00` }
  }

  const cellFor = ({ date, time }) => {
    const slotKey = `${date}|${time}`
    if (!byDate.has(date)) byDate.set(date, [])
    if (!bySlot.has(slotKey)) bySlot.set(slotKey, { time, scheduled: false })
    return bySlot.get(slotKey)
  }

  for (const stat of stats) {
    const key = keyOf(stat.slotStart)
    if (!key) continue
    const cell = cellFor(key)

    if (stat.pods !== undefined) {
      // The calendar shows the ACTUAL pods that ran; `category` is already actual-derived on the
      // backend. `pods` (unclamped desired) is only the history-vs-prediction discriminator here.
      cell.history = { pods: stat.actualPods, category: stat.category, id: stat.id }
      cell.instances = stat.actualPods
    } else {
      cell.predictions = { pods: stat.predictedPods, category: stat.category, id: stat.id }
      if (!cell.instances) cell.instances = stat.predictedPods
    }
  }

  // Last, so the scheduled floor overrides whatever the forecast put in `instances`. A scheduled slot
  // may also land where no forecast row exists (the horizon runs past the predictions we fetched), so
  // this creates the cell if it has to.
  for (const slot of scheduled) {
    const key = keyOf(slot.slotStart)
    if (!key) continue
    const cell = cellFor(key)
    cell.scheduled = { pods: slot.value, suggestionId: slot.suggestionId }
    cell.instances = slot.value
  }

  for (const [slotKey, cell] of bySlot) {
    const dateStr = slotKey.split('|')[0]
    byDate.get(dateStr).push(cell)
  }

  return Array.from(byDate, ([date, instances]) => ({ date, instances }))
}

export function buildWeeks (start, end) {
  const weeks = []
  let cursor = isoWeekStart(start)
  while (cursor <= end) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(cursor, i)
        return d >= start && d <= end ? new Date(d) : null
      })
    )
    cursor = addDays(cursor, 7)
  }
  return weeks
}
