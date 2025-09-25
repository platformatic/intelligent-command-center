import { useEffect } from 'react'

export default function useRefreshData (time, callback) {
  let interval = null
  useEffect(() => {
    interval = setInterval(() => {
      callback()
    }, time)

    return () => {
      clearInterval(interval)
    }
  }, [time])
}
