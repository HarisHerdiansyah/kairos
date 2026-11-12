export const DAY_NAMES: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
}

export const SHORT_DAY_NAMES: Record<number, string> = {
  1: "Sen",
  2: "Sel",
  3: "Rab",
  4: "Kam",
  5: "Jum",
  6: "Sab",
  7: "Min",
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
]

/**
 * Generates 30-minute time strings from "00:00" up to "24:00".
 */
export function getHalfHourTimeOptions(includeEndOfDay = true): string[] {
  const options: string[] = []
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, "0")
    options.push(`${hh}:00`)
    options.push(`${hh}:30`)
  }
  if (includeEndOfDay) {
    options.push("24:00")
  }
  return options
}

/**
 * Formats a YYYY-MM-DD date string into readable Indonesian format (e.g., "Kam, 12 Nov 2026").
 */
export function formatDateId(dateStr: string, includeDayName = true): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const [y, m, d] = dateStr.split("-").map(Number)
  const utcDate = new Date(Date.UTC(y, m - 1, d))
  const utcDay = utcDate.getUTCDay()
  const isoDay = utcDay === 0 ? 7 : utcDay
  const monthName = MONTH_NAMES[m - 1] || ""

  if (!includeDayName) {
    return `${d} ${monthName} ${y}`
  }
  return `${SHORT_DAY_NAMES[isoDay]}, ${d} ${monthName} ${y}`
}

/**
 * Formats a YYYY-MM-DD date string into compact header format for grid columns (e.g., "Kam, 12 Nov").
 */
export function formatShortDateHeader(dateStr: string): { dayName: string; dateLabel: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { dayName: "", dateLabel: dateStr }
  }
  const [y, m, d] = dateStr.split("-").map(Number)
  const utcDate = new Date(Date.UTC(y, m - 1, d))
  const utcDay = utcDate.getUTCDay()
  const isoDay = utcDay === 0 ? 7 : utcDay
  const monthName = MONTH_NAMES[m - 1] || ""

  return {
    dayName: DAY_NAMES[isoDay] || "",
    dateLabel: `${d} ${monthName}`,
  }
}

/**
 * Returns today's date string in WIB (UTC+7) in YYYY-MM-DD format.
 */
export function getTodayWibString(offsetDays = 0): string {
  const now = new Date()
  const wibTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000)
  wibTime.setDate(wibTime.getDate() + offsetDays)
  const y = wibTime.getFullYear()
  const m = String(wibTime.getMonth() + 1).padStart(2, "0")
  const d = String(wibTime.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

