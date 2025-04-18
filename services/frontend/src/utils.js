// Regular Expression for Application paths (must end with a trailing slash)
export const pathRegExp = /^((\/|(\\?))[\w\-_.]+)+\/$/i

export function copyValue (value) {
  if (value instanceof Object) {
    navigator.clipboard.writeText(JSON.stringify(value, null, 2))
  } else {
    navigator.clipboard.writeText(value)
  }
}

export function downloadFile ({ headers, id, body }) {
  let filename
  // Convert header names to lowercase for consistent access
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  )

  if (normalizedHeaders['content-encoding']?.startsWith('gzip')) {
    filename = `${id}.gzip`
  } else if (normalizedHeaders['content-type']?.startsWith('application/json')) {
    filename = `${id}.json`
  } else if (normalizedHeaders['content-type']) {
    filename = `${id}.${normalizedHeaders['content-type'].split('/')[1]}`
  } else {
    filename = `${id}.txt` // Default extension if no content-type is present
  }

  // Handle body content based on its type
  const content = typeof body === 'string' ? body : JSON.stringify(body, null, 2)

  const url = window.URL.createObjectURL(
    new Blob([content], {
      type: normalizedHeaders['content-type'] || 'text/plain'
    })
  )
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)

  // Append to html link element page
  document.body.appendChild(link)

  // Start download
  link.click()

  // Clean up and remove the link
  if (link.parentNode) {
    link.parentNode.removeChild(link)
  }

  // Clean up the URL object
  window.URL.revokeObjectURL(url)
}

/**
 * Generates a random UUID v4
 * @returns {string} A random UUID v4 string
 */
export function generateUUID () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
