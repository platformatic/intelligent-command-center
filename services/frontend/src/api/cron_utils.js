export const EVERY_2_MINUTES = '*/2 * * * *'
export const EVERY_DAY_12_00 = '0 0 * * *'
export const EVERY_WEEK_12_00_SUNDAY = '0 0 * * 0'
export const EVERY_MONTH_FIRST_DAY = ' 0 0 1 * *'

export const SYNC_QUEUE_NAME = 'sync'

export const calculateValueFromCron = (c) => {
  switch (c) {
    case EVERY_DAY_12_00:
      return '24H'
    case EVERY_WEEK_12_00_SUNDAY:
      return '1W'
    case EVERY_MONTH_FIRST_DAY:
      return '1M'
    case EVERY_2_MINUTES:
      return '2m'
    default:
      return 'OFF'
  }
}

export const calculateCronFromValue = (v) => {
  switch (v) {
    case '24H':
      return EVERY_DAY_12_00
    case '1W':
      return EVERY_WEEK_12_00_SUNDAY
    case '1M':
      return EVERY_MONTH_FIRST_DAY
    case '2m':
      return EVERY_2_MINUTES
    default:
      return null
  }
}
