/**
 * Pure date utilities operating strictly on 'YYYY-MM-DD' strings in UTC.
 * This guarantees zero timezone off-by-one errors and accurate calendar calculations.
 */

export function isValidDateString(dateStr: unknown): dateStr is string {
  if (typeof dateStr !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false

  const [year, month, day] = dateStr.split('-').map(Number)
  if (month < 1 || month > 12) return false

  const maxDays = daysInMonth(year, month)
  return day >= 1 && day <= maxDays
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28
    case 4:
    case 6:
    case 9:
    case 11:
      return 30
    default:
      return 31
  }
}

export function parseDateUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatDateUTC(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDateUTC(dateStr)
  date.setUTCDate(date.getUTCDate() + days)
  return formatDateUTC(date)
}

/**
 * Returns day of week in UTC: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
export function getWeekday(dateStr: string): number {
  return parseDateUTC(dateStr).getUTCDay()
}

export function getTodayUTC(): string {
  return formatDateUTC(new Date())
}

export function compareDates(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function daysBetween(from: string, to: string): number {
  const t1 = parseDateUTC(from).getTime()
  const t2 = parseDateUTC(to).getTime()
  return Math.round((t2 - t1) / (24 * 60 * 60 * 1000))
}

export function dateRange(from: string, to: string): string[] {
  if (from > to) return []
  const dates: string[] = []
  let current = from
  while (current <= to) {
    dates.push(current)
    current = addDays(current, 1)
  }
  return dates
}

