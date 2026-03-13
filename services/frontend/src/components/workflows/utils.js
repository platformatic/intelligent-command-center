// Based on @vercel/workflow web package (https://github.com/vercel/workflow)
// Copyright 2025 Vercel Inc. Licensed under Apache License 2.0.
// Modified for Platformatic ICC integration.

export function formatRelativeTime (dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

export function formatDuration (startStr, endStr) {
  if (!startStr) return '-'
  const start = new Date(startStr)
  const end = endStr ? new Date(endStr) : new Date()
  const diffMs = end - start
  const diffSec = Math.floor(diffMs / 1000)

  if (diffMs < 1000) return `${diffMs}ms`
  if (diffSec < 60) return `${diffSec}s`
  const diffMin = Math.floor(diffSec / 60)
  const remainSec = diffSec % 60
  if (diffMin < 60) return `${diffMin}m ${remainSec}s`
  const diffHr = Math.floor(diffMin / 60)
  const remainMin = diffMin % 60
  return `${diffHr}h ${remainMin}m`
}

export function formatStepName (raw) {
  if (!raw) return '-'
  // __builtin_response_text → response text
  if (raw.startsWith('__builtin_')) {
    return raw.slice(10).replace(/_/g, ' ')
  }
  // step//./workflows/pipeline//validateInput → validateInput
  const parts = raw.split('//')
  const last = parts[parts.length - 1]
  return last || raw
}

export function formatWorkflowName (raw) {
  if (!raw) return '-'
  // workflow//./workflows/pipeline//orderPipeline → orderPipeline
  const parts = raw.split('//')
  const last = parts[parts.length - 1]
  return last || raw
}
