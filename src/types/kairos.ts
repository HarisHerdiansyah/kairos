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

export const baselineInputSchema = z.object({
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

export type BaselineInput = z.infer<typeof baselineInputSchema>

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

export const overrideBlockInputSchema = z.object({
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

export type OverrideBlockInput = z.infer<typeof overrideBlockInputSchema>

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

export const overrideUnblockInputSchema = z.object({
  type: z.literal("unblock"),
  date_from: dateSchema,
  date_to: dateSchema,
  baseline_id: z.string().nullable(),
}).refine(
  (data) => data.date_to >= data.date_from,
  {
    message: "Tanggal akhir harus sama atau setelah tanggal mulai",
    path: ["date_to"],
  }
)

export type OverrideUnblockInput = z.infer<typeof overrideUnblockInputSchema>

export const overrideItemSchema = z.discriminatedUnion("type", [
  overrideBlockSchema,
  overrideUnblockSchema,
])

export type OverrideItem = z.infer<typeof overrideItemSchema>

export const overrideInputSchema = z.discriminatedUnion("type", [
  overrideBlockInputSchema,
  overrideUnblockInputSchema,
])

export type OverrideInput = z.infer<typeof overrideInputSchema>

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

export interface PersonalGridSlot {
  date: string
  start: string
  end: string
  status: "free" | "busy" | "overridden_free"
  label: string | null
}

export interface RoomCalculationResult {
  heatmap: HeatmapSlot[]
  best_times: BestTimeRecommendation[]
  deadlock: DeadlockResult
  waiting_for_participants: boolean
}

export interface SubSlotOption {
  start: string
  end: string
  duration_min: number
}

// -------------------------------------------------------------
// Room API Input Schemas
// -------------------------------------------------------------
export const roomCreateInputSchema = z
  .object({
    title: z.string().trim().min(1, { message: "Judul ruang temu tidak boleh kosong" }),
    date_from: dateSchema,
    date_to: dateSchema,
    time_from: timeSchema,
    time_to: timeSchema,
    duration_min: z.number().int().min(30, { message: "Durasi minimal 30 menit" }),
    quorum: z.number().int().min(2, { message: "Kuorum minimal 2 orang" }).default(2),
  })
  .refine((data) => data.date_to >= data.date_from, {
    message: "Tanggal akhir harus sama atau setelah tanggal mulai",
    path: ["date_to"],
  })
  .refine(
    (data) => {
      const [startH, startM] = data.time_from.split(":").map(Number)
      const [endH, endM] = data.time_to.split(":").map(Number)
      return endH * 60 + endM > startH * 60 + startM
    },
    {
      message: "Jam operasional selesai harus setelah jam mulai",
      path: ["time_to"],
    }
  )
  .refine((data) => data.duration_min % 30 === 0, {
    message: "Durasi rapat harus kelipatan 30 menit",
    path: ["duration_min"],
  })
  .refine(
    (data) => {
      const [startH, startM] = data.time_from.split(":").map(Number)
      const [endH, endM] = data.time_to.split(":").map(Number)
      const totalDayMins = endH * 60 + endM - (startH * 60 + startM)
      return data.duration_min <= totalDayMins
    },
    {
      message: "Durasi rapat tidak boleh melebihi rentang jam operasional harian",
      path: ["duration_min"],
    }
  )

export type RoomCreateInput = z.infer<typeof roomCreateInputSchema>
export const roomUpdateInputSchema = roomCreateInputSchema
export type RoomUpdateInput = z.infer<typeof roomUpdateInputSchema>

export const roomJoinGuestInputSchema = z.object({
  guest_name: z.string().trim().min(1, { message: "Nama tidak boleh kosong" }).max(50),
})
export type RoomJoinGuestInput = z.infer<typeof roomJoinGuestInputSchema>

export const roomAvailabilityInputSchema = z.object({
  room_input: z.array(roomInputSlotSchema),
})
export type RoomAvailabilityInput = z.infer<typeof roomAvailabilityInputSchema>

export const roomLockInputSchema = z.object({
  date: dateSchema,
  start: timeSchema,
  end: timeSchema,
})
export type RoomLockInput = z.infer<typeof roomLockInputSchema>

export interface RoomSummary {
  id: string
  title: string
  date_from: string
  date_to: string
  time_from: string
  time_to: string
  duration_min: number
  quorum: number
  status: "open" | "confirmed"
  locked_slot: LockedSlot | null
  created_at: string
  joined_at?: string
  owner_name?: string
  participant_count: number
  can_edit: boolean
  is_owner: boolean
}




