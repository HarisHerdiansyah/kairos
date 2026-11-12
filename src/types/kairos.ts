import { z } from "zod"

// -------------------------------------------------------------
// Primitives: Time (30-min resolution) and Date (YYYY-MM-DD WIB)
// -------------------------------------------------------------
export const timeRegex = /^(?:[01]\d|2[0-3]):(?:00|30)$|^24:00$/
export const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const timeSchema = z
  .string()
  .regex(timeRegex, { message: "Format jam harus HH:mm dengan kelipatan 30 menit (contoh: '08:00', '08:30')" })

export const dateSchema = z
  .string()
  .regex(dateRegex, { message: "Format tanggal harus YYYY-MM-DD" })

// -------------------------------------------------------------
// Baseline (Jadwal Rutin Mingguan)
// -------------------------------------------------------------
export const baselineItemSchema = z.object({
  id: z.string().min(1),
  day: z.number().int().min(1).max(7), // 1 = Senin, ..., 7 = Minggu
  start: timeSchema,
  end: timeSchema,
  label: z.string().trim().min(1, { message: "Nama kegiatan tidak boleh kosong" }),
}).refine(
  (data) => {
    const [startH, startM] = data.start.split(":").map(Number)
    const [endH, endM] = data.end.split(":").map(Number)
    const startMins = startH * 60 + startM
    const endMins = endH * 60 + endM
    return endMins > startMins
  },
  {
    message: "Jam selesai harus setelah jam mulai",
    path: ["end"],
  }
)

export type BaselineItem = z.infer<typeof baselineItemSchema>

// -------------------------------------------------------------
// Overrides (Jadwal Insidental: Block & Unblock)
// -------------------------------------------------------------
export const overrideBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("block"),
  date_from: dateSchema,
  date_to: dateSchema,
  start: timeSchema,
  end: timeSchema,
  label: z.string().trim().min(1, { message: "Nama kegiatan tidak boleh kosong" }),
}).refine(
  (data) => data.date_to >= data.date_from,
  {
    message: "Tanggal akhir harus sama atau setelah tanggal mulai",
    path: ["date_to"],
  }
).refine(
  (data) => {
    const [startH, startM] = data.start.split(":").map(Number)
    const [endH, endM] = data.end.split(":").map(Number)
    const startMins = startH * 60 + startM
    const endMins = endH * 60 + endM
    return endMins > startMins
  },
  {
    message: "Jam selesai harus setelah jam mulai",
    path: ["end"],
  }
)

export type OverrideBlock = z.infer<typeof overrideBlockSchema>

export const overrideUnblockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("unblock"),
  date_from: dateSchema,
  date_to: dateSchema,
  baseline_id: z.string().nullable(), // null = liburkan seluruh kegiatan di tanggal tersebut
}).refine(
  (data) => data.date_to >= data.date_from,
  {
    message: "Tanggal akhir harus sama atau setelah tanggal mulai",
    path: ["date_to"],
  }
)

export type OverrideUnblock = z.infer<typeof overrideUnblockSchema>

export const overrideItemSchema = z.discriminatedUnion("type", [
  overrideBlockSchema,
  overrideUnblockSchema,
])

export type OverrideItem = z.infer<typeof overrideItemSchema>

// -------------------------------------------------------------
// Room Input & Locked Slot
// -------------------------------------------------------------
export const roomInputSlotSchema = z.object({
  date: dateSchema,
  start: timeSchema,
  end: timeSchema,
})

export type RoomInputSlot = z.infer<typeof roomInputSlotSchema>

export const lockedSlotSchema = z.object({
  date: dateSchema,
  start: timeSchema,
  end: timeSchema,
  duration_min: z.number().int().positive(),
  available_count: z.number().int().nonnegative(),
  total_participants: z.number().int().positive(),
})

export type LockedSlot = z.infer<typeof lockedSlotSchema>

// -------------------------------------------------------------
// Engine & UI Computation Structures
// -------------------------------------------------------------
export interface HeatmapSlot {
  date: string
  start: string
  end: string
  busy_count: number
  available_count: number
  total_participants: number
}

export interface BestTimeRecommendation {
  date: string
  start: string
  end: string
  duration_min: number
  available_count: number
  total_participants: number
  type: "best_time" | "partial_participant" | "shorter_duration"
}

export interface DeadlockResult {
  is_deadlock: boolean
  partial_options: BestTimeRecommendation[]
  shorter_options: BestTimeRecommendation[]
}

