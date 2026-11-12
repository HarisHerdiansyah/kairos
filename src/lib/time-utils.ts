import {
  BaselineItem,
  baselineItemSchema,
  OverrideItem,
  overrideItemSchema,
  RoomInputSlot,
  roomInputSlotSchema,
} from "@/types/kairos"

/**
 * Converts a "HH:mm" time string into total minutes since midnight.
 * e.g. "08:30" -> 510, "24:00" -> 1440
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

/**
 * Converts total minutes since midnight back into "HH:mm" format.
 * e.g. 510 -> "08:30"
 */
export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

/**
 * Validates whether a date string is a real calendar date (YYYY-MM-DD).
 * Rejects invalid dates such as "2026-02-30" or "2026-11-31".
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const [year, month, day] = dateStr.split("-").map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  )
}

/**
 * Returns the ISO day of week for a given "YYYY-MM-DD" string.
 * 1 = Monday, 2 = Tuesday, ..., 7 = Sunday.
 */
export function getIsoDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = date.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return dayOfWeek === 0 ? 7 : dayOfWeek
}

/**
 * Generates an array of all date strings (YYYY-MM-DD) between dateFrom and dateTo inclusive.
 */
export function getDatesInRange(dateFrom: string, dateTo: string): string[] {
  const dates: string[] = []
  const [y1, m1, d1] = dateFrom.split("-").map(Number)
  const [y2, m2, d2] = dateTo.split("-").map(Number)

  const current = new Date(Date.UTC(y1, m1 - 1, d1))
  const end = new Date(Date.UTC(y2, m2 - 1, d2))

  while (current <= end) {
    const y = current.getUTCFullYear()
    const m = String(current.getUTCMonth() + 1).padStart(2, "0")
    const d = String(current.getUTCDate()).padStart(2, "0")
    dates.push(`${y}-${m}-${d}`)
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
}

/**
 * Checks if two time intervals on the same day overlap.
 * Adjacent intervals (e.g. 08:00-10:00 and 10:00-12:00) DO NOT overlap.
 */
export function isTimeRangeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA)
  const eA = timeToMinutes(endA)
  const sB = timeToMinutes(startB)
  const eB = timeToMinutes(endB)

  return sA < eB && sB < eA
}

/**
 * Finds if a candidate baseline slot overlaps with any existing baseline slot on the same day.
 * An optional excludeId can be provided when editing an existing slot.
 */
export function findOverlappingBaseline(
  candidate: { day: number; start: string; end: string },
  existingBaseline: BaselineItem[],
  excludeId?: string
): BaselineItem | null {
  for (const item of existingBaseline) {
    if (excludeId && item.id === excludeId) continue
    if (item.day !== candidate.day) continue

    if (isTimeRangeOverlapping(candidate.start, candidate.end, item.start, item.end)) {
      return item
    }
  }
  return null
}

/**
 * Safely parses the raw JSON array from database into validated BaselineItem[].
 */
export function parseBaselineList(raw: unknown): BaselineItem[] {
  if (!Array.isArray(raw)) return []
  const items: BaselineItem[] = []
  for (const item of raw) {
    const parsed = baselineItemSchema.safeParse(item)
    if (parsed.success) {
      items.push(parsed.data)
    }
  }
  return sortBaseline(items)
}

/**
 * Safely parses the raw JSON array from database into validated OverrideItem[].
 */
export function parseOverrideList(raw: unknown): OverrideItem[] {
  if (!Array.isArray(raw)) return []
  const items: OverrideItem[] = []
  for (const item of raw) {
    const parsed = overrideItemSchema.safeParse(item)
    if (parsed.success) {
      items.push(parsed.data)
    }
  }
  return sortOverrides(items)
}

/**
 * Sorts baseline items by day (1-7), then start time.
 */
export function sortBaseline(items: BaselineItem[]): BaselineItem[] {
  return [...items].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day
    return timeToMinutes(a.start) - timeToMinutes(b.start)
  })
}

/**
 * Sorts override items by date_from, then start time (for blocks) or type.
 */
export function sortOverrides(items: OverrideItem[]): OverrideItem[] {
  return [...items].sort((a, b) => {
    if (a.date_from !== b.date_from) return a.date_from.localeCompare(b.date_from)
    if (a.date_to !== b.date_to) return a.date_to.localeCompare(b.date_to)
    if (a.type === "block" && b.type === "block") {
      return timeToMinutes(a.start) - timeToMinutes(b.start)
    }
    return a.type.localeCompare(b.type)
  })
}

/**
 * Safely parses the raw JSON array from database into validated RoomInputSlot[].
 */
export function parseRoomInputList(raw: unknown): RoomInputSlot[] {
  if (!Array.isArray(raw)) return []
  const items: RoomInputSlot[] = []
  for (const item of raw) {
    const parsed = roomInputSlotSchema.safeParse(item)
    if (parsed.success) {
      items.push(parsed.data)
    }
  }
  return sortRoomInput(items)
}

/**
 * Sorts room input slots by date ASC, then start time ASC.
 */
export function sortRoomInput(items: RoomInputSlot[]): RoomInputSlot[] {
  return [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return timeToMinutes(a.start) - timeToMinutes(b.start)
  })
}


