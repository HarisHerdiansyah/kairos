import {
  BaselineItem,
  BestTimeRecommendation,
  HeatmapSlot,
  OverrideItem,
  PersonalGridSlot,
  RoomCalculationResult,
  RoomInputSlot,
  SubSlotOption,
} from "@/types/kairos"
import {
  getDatesInRange,
  getIsoDayOfWeek,
  isTimeRangeOverlapping,
  minutesToTime,
  timeToMinutes,
} from "@/lib/time-utils"

export interface RoomEngineParams {
  date_from: string
  date_to: string
  time_from: string
  time_to: string
  duration_min: number
  quorum: number
}

export interface EngineParticipant {
  id: string
  is_guest: boolean
  guest_name?: string | null
  user_id?: string | null
  baseline?: BaselineItem[]
  overrides?: OverrideItem[]
  room_input: RoomInputSlot[]
}

/**
 * Generates an array of contiguous 30-minute time slots between time_from and time_to.
 * e.g. "08:00" to "10:00" -> [{ start: "08:00", end: "08:30" }, { start: "08:30", end: "09:00" }, ...]
 */
export function generateDayHalfHourSlots(
  timeFrom: string,
  timeTo: string
): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = []
  const startMins = timeToMinutes(timeFrom)
  const endMins = timeToMinutes(timeTo)

  for (let m = startMins; m < endMins; m += 30) {
    slots.push({
      start: minutesToTime(m),
      end: minutesToTime(m + 30),
    })
  }

  return slots
}

/**
 * Resolves a single registered user's status for a specific 30-minute slot.
 * Evaluates in strict order:
 * 1. Baseline (a)
 * 2. Eventual Unblock (b)
 * 3. Eventual Block (c)
 * 4. Room-Level Override (d) - only allows "busy" -> "hadir"
 */
export function resolveUserSlotStatus(
  dateStr: string,
  slotStart: string,
  slotEnd: string,
  baseline: BaselineItem[],
  overrides: OverrideItem[],
  roomInput: RoomInputSlot[]
): { is_busy: boolean; status: "free" | "busy" | "overridden_free"; label: string | null } {
  const dayOfWeek = getIsoDayOfWeek(dateStr)

  // 1. Check Baseline for this day of week
  const matchingBaseline = baseline.find(
    (b) => b.day === dayOfWeek && isTimeRangeOverlapping(b.start, b.end, slotStart, slotEnd)
  )

  let isBusy = Boolean(matchingBaseline)
  let activeLabel: string | null = matchingBaseline ? matchingBaseline.label : null
  const baselineId = matchingBaseline ? matchingBaseline.id : null

  // 2. Eventual Unblock (relieves baseline if matching baseline_id or entire day null)
  if (isBusy && baselineId) {
    const isUnblocked = overrides.some(
      (o) =>
        o.type === "unblock" &&
        dateStr >= o.date_from &&
        dateStr <= o.date_to &&
        (o.baseline_id === null || o.baseline_id === baselineId)
    )

    if (isUnblocked) {
      isBusy = false
      activeLabel = null
    }
  }

  // 3. Eventual Block (adds incidental busy block)
  const matchingBlock = overrides.find(
    (o) =>
      o.type === "block" &&
      dateStr >= o.date_from &&
      dateStr <= o.date_to &&
      isTimeRangeOverlapping(o.start, o.end, slotStart, slotEnd)
  )

  if (matchingBlock && matchingBlock.type === "block") {
    isBusy = true
    activeLabel = matchingBlock.label
  }

  // 4. Room-Level Override: user specifically marked this slot as "hadir" in this room
  if (isBusy) {
    const isOverridden = roomInput.some(
      (r) => r.date === dateStr && isTimeRangeOverlapping(r.start, r.end, slotStart, slotEnd)
    )

    if (isOverridden) {
      return {
        is_busy: false,
        status: "overridden_free",
        label: activeLabel,
      }
    }

    return {
      is_busy: true,
      status: "busy",
      label: activeLabel,
    }
  }

  return {
    is_busy: false,
    status: "free",
    label: null,
  }
}

/**
 * Resolves a guest's status for a specific 30-minute slot.
 * For guests, room_input represents manual free slots.
 * Any slot outside room_input is considered busy (busy = opposite of room_input).
 */
export function resolveGuestSlotStatus(
  dateStr: string,
  slotStart: string,
  slotEnd: string,
  roomInput: RoomInputSlot[]
): { is_busy: boolean; status: "free" | "busy" } {
  const isMarkedFree = roomInput.some(
    (r) => r.date === dateStr && isTimeRangeOverlapping(r.start, r.end, slotStart, slotEnd)
  )

  return {
    is_busy: !isMarkedFree,
    status: isMarkedFree ? "free" : "busy",
  }
}

/**
 * Builds the private schedule grid for a specific viewing actor.
 * Includes private labels and status indicators ("free", "busy", "overridden_free").
 */
export function resolvePersonalScheduleGrid(
  params: RoomEngineParams,
  participant: EngineParticipant
): PersonalGridSlot[] {
  const dates = getDatesInRange(params.date_from, params.date_to)
  const daySlots = generateDayHalfHourSlots(params.time_from, params.time_to)
  const grid: PersonalGridSlot[] = []

  for (const date of dates) {
    for (const slot of daySlots) {
      if (participant.is_guest) {
        const res = resolveGuestSlotStatus(date, slot.start, slot.end, participant.room_input)
        grid.push({
          date,
          start: slot.start,
          end: slot.end,
          status: res.status,
          label: null,
        })
      } else {
        const res = resolveUserSlotStatus(
          date,
          slot.start,
          slot.end,
          participant.baseline || [],
          participant.overrides || [],
          participant.room_input
        )
        grid.push({
          date,
          start: slot.start,
          end: slot.end,
          status: res.status,
          label: res.label,
        })
      }
    }
  }

  return grid
}

/**
 * Core engine calculation:
 * 1. Computes anonymous heatmap per 30-min slot (no labels or user identities).
 * 2. Merges contiguous time windows.
 * 3. Evaluates Best Time (F7), Deadlock Tolerances (F8), and Absolute Deadlock.
 */
export function calculateRoomSchedule(
  params: RoomEngineParams,
  participants: EngineParticipant[]
): RoomCalculationResult {
  const totalParticipants = participants.length
  const dates = getDatesInRange(params.date_from, params.date_to)
  const daySlots = generateDayHalfHourSlots(params.time_from, params.time_to)

  // 1. Build anonymous heatmap slots
  const heatmap: HeatmapSlot[] = []
  // Organize slots by date for window aggregation
  const slotsByDate: Record<string, HeatmapSlot[]> = {}

  for (const date of dates) {
    slotsByDate[date] = []
    for (const slot of daySlots) {
      let busyCount = 0

      for (const p of participants) {
        if (p.is_guest) {
          const res = resolveGuestSlotStatus(date, slot.start, slot.end, p.room_input)
          if (res.is_busy) busyCount++
        } else {
          const res = resolveUserSlotStatus(
            date,
            slot.start,
            slot.end,
            p.baseline || [],
            p.overrides || [],
            p.room_input
          )
          if (res.is_busy) busyCount++
        }
      }

      const availableCount = totalParticipants - busyCount
      const hSlot: HeatmapSlot = {
        date,
        start: slot.start,
        end: slot.end,
        busy_count: busyCount,
        available_count: availableCount,
        total_participants: totalParticipants,
      }

      heatmap.push(hSlot)
      slotsByDate[date].push(hSlot)
    }
  }

  // If room has less than 2 participants, we are waiting for participants
  if (totalParticipants < 2) {
    return {
      heatmap,
      best_times: [],
      deadlock: {
        is_deadlock: false,
        partial_options: [],
        shorter_options: [],
      },
      waiting_for_participants: true,
    }
  }

  // 2. Window Aggregation: Find contiguous windows where available_count >= k (for k >= 2)
  interface RawWindow {
    date: string
    start: string
    end: string
    duration_min: number
    available_count: number
  }

  const rawWindows: RawWindow[] = []

  // Check thresholds from 2 up to totalParticipants
  for (let k = 2; k <= totalParticipants; k++) {
    for (const date of dates) {
      const dayHeatmap = slotsByDate[date] || []
      let currentRun: HeatmapSlot[] = []

      for (const slot of dayHeatmap) {
        if (slot.available_count >= k) {
          currentRun.push(slot)
        } else {
          if (currentRun.length > 0) {
            const minAvail = Math.min(...currentRun.map((s) => s.available_count))
            // Only capture if this window's actual bottleneck matches threshold k
            if (minAvail === k) {
              rawWindows.push({
                date,
                start: currentRun[0].start,
                end: currentRun[currentRun.length - 1].end,
                duration_min: currentRun.length * 30,
                available_count: k,
              })
            }
            currentRun = []
          }
        }
      }

      if (currentRun.length > 0) {
        const minAvail = Math.min(...currentRun.map((s) => s.available_count))
        if (minAvail === k) {
          rawWindows.push({
            date,
            start: currentRun[0].start,
            end: currentRun[currentRun.length - 1].end,
            duration_min: currentRun.length * 30,
            available_count: k,
          })
        }
      }
    }
  }

  // Deduplicate identical intervals, keeping the higher available_count
  const windowMap = new Map<string, RawWindow>()
  for (const win of rawWindows) {
    const key = `${win.date}_${win.start}_${win.end}`
    const existing = windowMap.get(key)
    if (!existing || win.available_count > existing.available_count) {
      windowMap.set(key, win)
    }
  }
  const uniqueWindows = Array.from(windowMap.values())

  // Quorum target is an exact integer specified by the initiator (at least 2)
  const quorumTarget = Math.max(params.quorum, 2)

  // 3. F7: Best Time candidates
  // Conditions: duration >= duration_min AND available_count >= quorumTarget
  const bestTimeCandidates = uniqueWindows.filter(
    (w) => w.duration_min >= params.duration_min && w.available_count >= quorumTarget
  )

  // Sort Best Time:
  // 1. available_count DESC
  // 2. duration_min DESC
  // 3. date ASC, start ASC
  bestTimeCandidates.sort((a, b) => {
    if (a.available_count !== b.available_count) return b.available_count - a.available_count
    if (a.duration_min !== b.duration_min) return b.duration_min - a.duration_min
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return timeToMinutes(a.start) - timeToMinutes(b.start)
  })

  const bestTimes: BestTimeRecommendation[] = bestTimeCandidates.slice(0, 5).map((w) => ({
    date: w.date,
    start: w.start,
    end: w.end,
    duration_min: w.duration_min,
    available_count: w.available_count,
    total_participants: totalParticipants,
    type: "best_time",
  }))

  // 4. F8: Deadlock Handling (Triggered when bestTimes is empty)
  let partialOptions: BestTimeRecommendation[] = []
  let shorterOptions: BestTimeRecommendation[] = []
  let isDeadlock = false

  if (bestTimes.length === 0) {
    // 4a. Partial Participants: duration >= duration_min, but 2 <= available_count < quorumTarget
    const partialCandidates = uniqueWindows.filter(
      (w) => w.duration_min >= params.duration_min && w.available_count >= 2 && w.available_count < quorumTarget
    )

    partialCandidates.sort((a, b) => {
      if (a.available_count !== b.available_count) return b.available_count - a.available_count
      if (a.duration_min !== b.duration_min) return b.duration_min - a.duration_min
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return timeToMinutes(a.start) - timeToMinutes(b.start)
    })

    partialOptions = partialCandidates.slice(0, 3).map((w) => ({
      date: w.date,
      start: w.start,
      end: w.end,
      duration_min: w.duration_min,
      available_count: w.available_count,
      total_participants: totalParticipants,
      type: "partial_participant",
    }))

    // 4b. Shorter Duration: 30 <= duration < duration_min, with available_count >= 2
    const shorterCandidates = uniqueWindows.filter(
      (w) => w.duration_min < params.duration_min && w.duration_min >= 30 && w.available_count >= 2
    )

    shorterCandidates.sort((a, b) => {
      if (a.duration_min !== b.duration_min) return b.duration_min - a.duration_min
      if (a.available_count !== b.available_count) return b.available_count - a.available_count
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return timeToMinutes(a.start) - timeToMinutes(b.start)
    })

    shorterOptions = shorterCandidates.slice(0, 3).map((w) => ({
      date: w.date,
      start: w.start,
      end: w.end,
      duration_min: w.duration_min,
      available_count: w.available_count,
      total_participants: totalParticipants,
      type: "shorter_duration",
    }))

    // Absolute Deadlock occurs if even partial and shorter options are empty (no interval with >= 2 participants)
    if (partialOptions.length === 0 && shorterOptions.length === 0) {
      isDeadlock = true
    }
  }

  return {
    heatmap,
    best_times: bestTimes,
    deadlock: {
      is_deadlock: isDeadlock,
      partial_options: partialOptions,
      shorter_options: shorterOptions,
    },
    waiting_for_participants: false,
  }
}

/**
 * Generates selectable sub-slot intervals of exact targetDurationMin within a wider window.
 * Used for Lock Schedule (Option B):
 * e.g., if window is 08:00 to 11:00 (180 mins) and target is 60 mins:
 * returns:
 * - 08:00 - 09:00
 * - 08:30 - 09:30
 * - 09:00 - 10:00
 * - 09:30 - 10:30
 * - 10:00 - 11:00
 */
export function generateSubSlots(
  windowStart: string,
  windowEnd: string,
  targetDurationMin: number
): SubSlotOption[] {
  const windowStartMins = timeToMinutes(windowStart)
  const windowEndMins = timeToMinutes(windowEnd)
  const windowDuration = windowEndMins - windowStartMins

  // If the window is equal to or shorter than target duration (e.g. Shorter Duration deadlock),
  // return the entire window as the single option.
  if (windowDuration <= targetDurationMin) {
    return [
      {
        start: windowStart,
        end: windowEnd,
        duration_min: windowDuration,
      },
    ]
  }

  const subSlots: SubSlotOption[] = []
  for (let s = windowStartMins; s + targetDurationMin <= windowEndMins; s += 30) {
    subSlots.push({
      start: minutesToTime(s),
      end: minutesToTime(s + targetDurationMin),
      duration_min: targetDurationMin,
    })
  }

  return subSlots
}
