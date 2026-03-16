import React, { useEffect, useState, useCallback } from 'react'
import { parse as devalueParse } from 'devalue'
import callApi from '~/api/common'
import styles from './StreamsTable.module.css'

function decodeStreamChunks (buffer) {
  // Each stream chunk is serialized as:
  // [4-byte big-endian length][devl][devalue payload]
  // The length includes the "devl" header (4 bytes) + payload.
  const chunks = []
  const view = new DataView(buffer)
  let pos = 0

  while (pos + 4 <= buffer.byteLength) {
    const len = view.getUint32(pos, false) // big-endian
    pos += 4

    if (pos + len > buffer.byteLength) break

    const chunkBytes = new Uint8Array(buffer, pos, len)
    const chunkStr = new TextDecoder().decode(chunkBytes)

    if (chunkStr.startsWith('devl')) {
      const payload = chunkStr.slice(4)
      try {
        chunks.push(devalueParse(payload))
      } catch {
        chunks.push(payload)
      }
    } else {
      chunks.push(chunkStr)
    }

    pos += len
  }

  // If no structured chunks found, return the raw text
  if (chunks.length === 0) {
    chunks.push(new TextDecoder().decode(buffer))
  }

  return chunks
}

function formatChunk (chunk, index) {
  if (typeof chunk === 'string') return chunk
  if (chunk instanceof Uint8Array || (chunk && chunk.type === 'Buffer')) {
    return `[Binary: ${chunk.length || chunk.data?.length || 0} bytes]`
  }
  try {
    return JSON.stringify(chunk, null, 2)
  } catch {
    return String(chunk)
  }
}

export default function StreamsTable ({ appId, runId }) {
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedStream, setExpandedStream] = useState(null)
  const [streamChunks, setStreamChunks] = useState({})

  const loadStreams = useCallback(async () => {
    try {
      const data = await callApi('', `/api/workflow/apps/${appId}/runs/${runId}/streams`, 'GET')
      setStreams(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading streams:', err)
    } finally {
      setLoading(false)
    }
  }, [appId, runId])

  useEffect(() => {
    loadStreams()
  }, [loadStreams])

  const loadStreamContent = useCallback(async (name) => {
    if (streamChunks[name]) return
    try {
      const response = await fetch(`/api/workflow/apps/${appId}/streams/${encodeURIComponent(name)}`)
      const buffer = await response.arrayBuffer()
      const chunks = decodeStreamChunks(buffer)
      setStreamChunks(prev => ({ ...prev, [name]: chunks }))
    } catch (err) {
      console.error('Error loading stream content:', err)
      setStreamChunks(prev => ({ ...prev, [name]: [`Error: ${err.message}`] }))
    }
  }, [appId, streamChunks])

  const toggleStream = (name) => {
    if (expandedStream === name) {
      setExpandedStream(null)
    } else {
      setExpandedStream(name)
      loadStreamContent(name)
    }
  }

  if (loading) {
    return <p className={styles.emptyText}>Loading streams...</p>
  }

  if (streams.length === 0) {
    return <p className={styles.emptyText}>No streams recorded for this run.</p>
  }

  return (
    <div className={styles.container}>
      {streams.map((name) => {
        const chunks = streamChunks[name]
        const isExpanded = expandedStream === name
        return (
          <div key={name} className={styles.streamCard}>
            <div
              className={styles.streamHeader}
              onClick={() => toggleStream(name)}
            >
              <span className={styles.expandIcon}>
                {isExpanded ? '\u25BE' : '\u25B8'}
              </span>
              <span className={styles.streamName}>{name}</span>
              {chunks && (
                <span className={styles.chunkCount}>{chunks.length} chunk{chunks.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            {isExpanded && (
              <div className={styles.streamContent}>
                {chunks
                  ? chunks.map((chunk, i) => (
                    <div key={i} className={styles.chunkRow}>
                      <span className={styles.chunkIndex}>{i}</span>
                      <pre className={styles.chunkData}>{formatChunk(chunk, i)}</pre>
                    </div>
                  ))
                  : <p className={styles.loadingText}>Loading content...</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
