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
// shape the calendar expects: { date: 'MM-DD-YYYY', instances: [{ time, instances, scheduled }] }
// slotStart is UTC, and PlannerColumn already treats hour keys as UTC hours.
// timeWindowStats slots are hourly (pods); timeWindowPredictions slots are
// 15-minute (predictedPods) — only the on-the-hour slot is kept so both line
// up with the calendar's hourly grid.
export function groupTimeWindowStats (stats) {
  const byDate = new Map()
  for (const stat of stats) {
    const slot = new Date(stat.slotStart)
    if (slot.getUTCMinutes() !== 0) continue

    const mm = String(slot.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(slot.getUTCDate()).padStart(2, '0')
    const date = `${mm}-${dd}-${slot.getUTCFullYear()}`
    const time = `${slot.getUTCHours()}:00`
    const pods = stat.pods ?? stat.predictedPods

    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push({ time, instances: pods, category: stat.category, scheduled: false })
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
