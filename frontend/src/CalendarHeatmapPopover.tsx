import { useEffect, useMemo, useRef, useState } from 'react'
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
  // Local month/year view state initialised to the selected date
  const [viewDate, setViewDate] = useState(() => {
    const d = parseDateKey(selectedDate)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const cardRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Focus the card when it mounts so Escape works without a click first
  useEffect(() => {
    cardRef.current?.focus()
  }, [])

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

  // Generate Monday-first grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewDate.year, viewDate.month, 1)
    const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate()
    // getDay(): 0=Sunday → convert to Mon=0 … Sun=6
    const firstDayIndex = (firstDay.getDay() + 6) % 7

    const cells: Array<{
      key: string
      dayNum: number
      isCurrentMonth: boolean
      heatLevel: 0 | 1 | 2 | 3
      isToday: boolean
      isSelected: boolean
    }> = []

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ key: `empty-${i}`, dayNum: 0, isCurrentMonth: false, heatLevel: 0, isToday: false, isSelected: false })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewDate.year, viewDate.month, day)
      const k = dateKey(d)
      const scheduledTasks = tasks.filter((t) => isScheduledOn(t, k))

      let heatLevel: 0 | 1 | 2 | 3 = 0
      if (scheduledTasks.length > 0) {
        const completedCount = scheduledTasks.filter((t) => isCompletedOn(t, k)).length
        if (completedCount > 0) {
          const ratio = completedCount / scheduledTasks.length
          heatLevel = ratio === 1 ? 3 : ratio >= 0.5 ? 2 : 1
        }
      }

      cells.push({
        key: k,
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
    <div
      className="popover-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Select date"
    >
      <div
        ref={cardRef}
        className="popover-card"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Month navigation */}
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

        {/* Weekday headers */}
        <div className="calendar-grid-header">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        {/* Day grid */}
        <div className="calendar-grid">
          {calendarDays.map((cell) => {
            if (!cell.isCurrentMonth) {
              return <div key={cell.key} className="cal-cell empty" />
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
                key={cell.key}
                type="button"
                className={classes}
                onClick={() => { onSelectDate(cell.key); onClose() }}
                aria-label={`${cell.key}${cell.isToday ? ' (Today)' : ''}`}
                aria-pressed={cell.isSelected}
              >
                <span>{cell.dayNum}</span>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="calendar-legend">
          <span className="legend-label">Less</span>
          <div className="cal-cell-sample heat-0" title="0%" />
          <div className="cal-cell-sample heat-1" title="< 50%" />
          <div className="cal-cell-sample heat-2" title="50–99%" />
          <div className="cal-cell-sample heat-3" title="100%" />
          <span className="legend-label">More</span>
        </div>
      </div>
    </div>
  )
}
