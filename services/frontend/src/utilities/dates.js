import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)
export const getFormattedDate = (date) => {
  const dateObject = getDateObjectIfValid(date)
  if (dateObject === false) return '-'
  return dateObject.format('MMM DD, YYYY')
}

export const getFormattedTimeAndDate = (date) => {
  const dateObject = getDateObjectIfValid(date)
  if (dateObject === false) return '-'
  return dateObject.format('YYYY-MM-DD [[]HH:mm:ss]')
}

export const getFormattedTime = (date) => {
  const dateObject = getDateObjectIfValid(date)
  if (dateObject === false) return '-'
  return dateObject.format('[[]HH:mm:ss]')
}

export const getFormattedLogTimestamp = (date, includeMilliseconds = false) => {
  const dateObject = getDateObjectIfValid(date)
  if (dateObject === false) return '-'
  if (includeMilliseconds) {
    return dateObject.format('HH:mm:ss.SSS')
  }
  return dateObject.format('HH:mm:ss')
}

function getDateObjectIfValid (date) {
  if (date === '-') return false
  if (!(typeof date === 'string' || typeof date === 'number')) return false

  const dateObject = dayjs.utc(date)
  if (!dateObject.isValid()) {
    return false
  }
  return dateObject
}
