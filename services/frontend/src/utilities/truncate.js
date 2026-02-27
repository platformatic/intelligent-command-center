export function truncateLabel (value, maxLen = 7) {
  if (!value || value.length <= maxLen) return value
  return value.slice(0, maxLen) + '…'
}

export function truncatePodId (value, startLen = 5, endLen = 10) {
  if (!value || value.length <= startLen + endLen) return value
  return value.slice(0, startLen) + '…' + value.slice(-endLen)
}
