import { useMemo, useState } from 'react'
import {
  dateKey,
  isCompletedOn,
  isScheduledOn,
  parseDateKey,
} from './schedule'
import type { Task } from './types'

interface CalendarHeatmapPopoverProps {
  selectedDate: string
  today: string
  tasks: Task[]
  onSelectDate: (date: string) => void
  onClose: () => void
}

export function CalendarHeatmapPopover({
  selectedDate,
  today,
  tasks,
  onSelectDate,
  onClose,
}: CalendarHeatmapPopoverProps) {
  // Local month/year view state initialized to selectedDate
  const [viewDate, setViewDate] = useState(() => {
    const d = parseDateKey(selectedDate)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  function prevMonth() {
    setViewDate((cur) => {
      if (cur.month === 0) return { year: cur.year - 1, month: 11 }
      return { year: cur.year, month: cur.month - 1 }
    })
  }

  function nextMonth() {
    setViewDate((cur) => {
      if (cur.month === 11) return { year: cur.year + 1, month: 0 }
      return { year: cur.year, month: cur.month + 1 }
    })
  }

  const monthTitle = useMemo(() => {
    const d = new Date(viewDate.year, viewDate.month, 1)
    return new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
    }).format(d)
  }, [viewDate])

  // Generate grid for Monday-start calendar
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewDate.year, viewDate.month, 1)
    const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate()

    // getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
    // Convert to Monday = 0 ... Sunday = 6
    const firstDayIndex = (firstDay.getDay() + 6) % 7

    const cells: Array<{
      dateKeyString: string
      dayNum: number
      isCurrentMonth: boolean
      heatLevel: 0 | 1 | 2 | 3
      isToday: boolean
      isSelected: boolean
    }> = []

    // Empty cells before first day of month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({
        dateKeyString: `empty-${i}`,
        dayNum: 0,
        isCurrentMonth: false,
        heatLevel: 0,
        isToday: false,
        isSelected: false,
      })
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewDate.year, viewDate.month, day)
      const k = dateKey(d)

      // Heat level computation:
      // 0 completed: level 0 (transparent)
      // some completed but under 50%: level 1 (lightest orange ~20%)
      // 50% to under 100%: level 2 (medium orange ~50%)
      // 100% completed: level 3 (full orange ~100%)
      const scheduledTasks = tasks.filter((t) => isScheduledOn(t, k))
      let heatLevel: 0 | 1 | 2 | 3 = 0

      if (scheduledTasks.length > 0) {
        const completedCount = scheduledTasks.filter((t) => isCompletedOn(t, k)).length
        if (completedCount === 0) {
          heatLevel = 0
        } else {
          const ratio = completedCount / scheduledTasks.length
          if (ratio === 1) {
            heatLevel = 3
          } else if (ratio >= 0.5) {
            heatLevel = 2
          } else {
            heatLevel = 1
          }
        }
      }

      cells.push({
        dateKeyString: k,
        dayNum: day,
        isCurrentMonth: true,
        heatLevel,
        isToday: k === today,
        isSelected: k === selectedDate,
      })
    }

    return cells
  }, [viewDate, tasks, today, selectedDate])

  return (
    <div className="popover-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="popover-card" onClick={(e) => e.stopPropagation()}>
        <div className="popover-header">
          <button
            type="button"
            className="cal-nav-btn"
            onClick={prevMonth}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="popover-title">{monthTitle}</span>
          <button
            type="button"
            className="cal-nav-btn"
            onClick={nextMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="calendar-grid-header">
          <span>M</span>
          <span>T</span>
          <span>W</span>
          <span>T</span>
          <span>F</span>
          <span>S</span>
          <span>S</span>
        </div>

        <div className="calendar-grid">
          {calendarDays.map((cell) => {
            if (!cell.isCurrentMonth) {
              return <div key={cell.dateKeyString} className="cal-cell empty" />
            }

            const classes = [
              'cal-cell',
              `heat-${cell.heatLevel}`,
              cell.isToday ? 'today' : '',
              cell.isSelected ? 'selected' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <button
                key={cell.dateKeyString}
                type="button"
                className={classes}
                onClick={() => {
                  onSelectDate(cell.dateKeyString)
                  onClose()
                }}
                aria-label={`${cell.dateKeyString}${cell.isToday ? ' (Today)' : ''}`}
              >
                <span>{cell.dayNum}</span>
              </button>
            )
          })}
        </div>

        <div className="calendar-legend">
          <span className="legend-label">Less</span>
          <div className="cal-cell-sample heat-0" title="0%" />
          <div className="cal-cell-sample heat-1" title="< 50%" />
          <div className="cal-cell-sample heat-2" title="50% - 99%" />
          <div className="cal-cell-sample heat-3" title="100%" />
          <span className="legend-label">More</span>
        </div>
      </div>
    </div>
  )
}
