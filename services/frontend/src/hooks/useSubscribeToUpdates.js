import { useEffect } from 'react'
import useWebSocket from 'react-use-websocket'

export default function useSubscribeToUpdates (topic) {
  const { sendMessage, lastMessage, readyState } = useWebSocket(`${import.meta.env.VITE_SERVER_URL}/api/updates/icc`)
  useEffect(() => {
    if (!topic.startsWith('ui-updates/')) {
      topic = `icc/ui-updates/${topic}`
    }
    sendMessage(JSON.stringify({ command: 'subscribe', topic }))
    return () => {
      sendMessage(JSON.stringify({ command: 'unsubscribe', topic }))
    }
  }, [])
  return { readyState, lastMessage }
}
