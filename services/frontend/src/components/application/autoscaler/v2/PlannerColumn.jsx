import React from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import PlannerRow from './PlannerRow'
import { HOURS, formatDate, sameDay } from './plannerUtils'
import styles from './PlannerColumn.module.css'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function weekMonthLabel (days) {
  const months = [...new Set(days.map(d => d.getMonth()))]
  return months.map(m => MONTH_NAMES[m]).join(' / ')
}

// days: array of 7 Date|null values (null = day outside the visible range)
// dataByDate: { 'MM-DD-YYYY': DayEntry }
// today: Date (midnight)
export default function PlannerColumn ({ days, dataByDate, today, hoverState, setHoverState, categoryConfig, selectedSuggestion }) {
  const visibleDays = days.filter(Boolean)

  return (
    <div className={styles.column}>
      <div className={styles.header}>
        <span className={styles.monthLabel}>{weekMonthLabel(visibleDays)}</span>
        <div className={styles.dayHeaders}>
          {days.map((day, di) => {
            const isToday = day && sameDay(day, today)
            return (
              <div
                key={di}
                className={`${styles.dayHeader} ${isToday ? styles.dayHeaderToday : ''} ${!day ? styles.dayHeaderEmpty : ''}`}
                onMouseEnter={day ? () => setHoverState({ dayOfWeek: di, hour: null }) : undefined}
              >
                {day && (
                  <>
                    <span className={`${styles.dayName} ${typographyStyles.textWhite70}`}>
                      {DAY_NAMES[di]}
                    </span>
                    <span className={`${styles.dateNum} ${isToday ? typographyStyles.textWhite : typographyStyles.textWhite70}`}>
                      {day.getDate()}
                    </span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.body}>
        {HOURS.map((hour, hi) => {
          const utcHour = parseInt(hour, 10)
          const cells = days.map(day => {
            if (!day) return null
            const dayData = dataByDate[formatDate(day)]
            const entry = dayData?.instances.find(e => e.time === hour) ?? null
            if (!entry) return null

            // API times are UTC — compare the UTC moment to now to determine past/future
            const [mm, dd, yyyy] = formatDate(day).split('-').map(Number)
            const utcMoment = new Date(Date.UTC(yyyy, mm - 1, dd, utcHour, 0, 0))
            const isFuture = utcMoment.getTime() > Date.now()
            const predicted = isFuture && !entry.scheduled

            return { entry: { ...entry, predicted }, isFuture }
          })
          return (
            <PlannerRow
              key={hour}
              hourIndex={hi}
              cells={cells}
              hoverState={hoverState}
              setHoverState={setHoverState}
              categoryConfig={categoryConfig}
              selectedSuggestion={selectedSuggestion}
            />
          )
        })}
      </div>
    </div>
  )
}
