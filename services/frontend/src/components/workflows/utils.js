// Based on @vercel/workflow web package (https://github.com/vercel/workflow)
// Copyright 2025 Vercel Inc. Licensed under Apache License 2.0.
// Modified for Platformatic ICC integration.

import { parse as devalueParse } from 'devalue'

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

// The Vercel workflow SDK serializes data as: 4-byte "devl" header + devalue-encoded payload.
// When stored as BYTEA and returned via the API, these appear as base64 strings.
// This function decodes them for human-readable display in the ICC dashboard.
const DEVL_HEADER = 'devl'

function tryDecodeBase64Devalue (str) {
  if (typeof str !== 'string' || str.length < 8) return str
  try {
    // atob decodes base64 to a binary string
    const binary = atob(str)
    // Check for "devl" header
    if (binary.startsWith(DEVL_HEADER)) {
      const payload = binary.slice(4)
      return devalueParse(payload)
    }
    // Try plain JSON
    const first = binary.charCodeAt(0)
    if (first === 0x7b || first === 0x5b || first === 0x22) {
      return JSON.parse(binary)
    }
  } catch {
    // Not valid base64, devalue, or JSON — return original
  }
  return str
}

// Fields that contain base64-encoded SDK data in event payloads
const BINARY_FIELDS = new Set(['result', 'output', 'input', 'payload', 'metadata'])

// Recursively decode base64/devalue fields in event data for display
export function decodeEventData (data) {
  if (data === null || data === undefined) return data
  if (typeof data === 'string') return tryDecodeBase64Devalue(data)
  if (Array.isArray(data)) return data.map(decodeEventData)
  if (typeof data === 'object') {
    const decoded = {}
    for (const [key, value] of Object.entries(data)) {
      decoded[key] = BINARY_FIELDS.has(key) ? tryDecodeBase64Devalue(value) : value
    }
    return decoded
  }
  return data
}
