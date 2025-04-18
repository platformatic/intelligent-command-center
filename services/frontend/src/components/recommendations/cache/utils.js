export function renderTTL (ttl) {
  return `${ttl}s`
}

export function normalizeHistory (history) {
  return history.map((item) => {
    if (item.frequency >= 1) {
      return {
        ...item,
        frequency: 1
      }
    }
    return item
  })
}
