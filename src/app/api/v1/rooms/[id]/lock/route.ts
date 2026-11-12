import { resolveRoomActor } from "@/lib/auth"
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { roomLockInputSchema, LockedSlot } from "@/types/kairos"
import {
  isTimeRangeOverlapping,
  parseBaselineList,
  parseOverrideList,
  parseRoomInputList,
  timeToMinutes,
} from "@/lib/time-utils"
import { calculateRoomSchedule, EngineParticipant } from "@/lib/scheduler-engine"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const actor = await resolveRoomActor(request, id)
    if (!actor) {
      return apiError("Ruang temu tidak ditemukan", 404)
    }

    if (!actor.isOwner) {
      return apiError("Hanya inisiator yang berhak mengunci jadwal", 403)
    }

    if (actor.session.status !== "open") {
      return apiError("Ruang temu sudah berstatus Confirmed (terkunci)", 400)
    }

    const body = await request.json()
    const input = roomLockInputSchema.parse(body)

    // Validate boundaries
    if (input.date < actor.session.date_from || input.date > actor.session.date_to) {
      return apiError(
        `Tanggal yang dipilih berada di luar rentang tanggal ruang temu (${actor.session.date_from} s/d ${actor.session.date_to})`,
        400
      )
    }

    const startMins = timeToMinutes(input.start)
    const endMins = timeToMinutes(input.end)
    const sessionStartMins = timeToMinutes(actor.session.time_from)
    const sessionEndMins = timeToMinutes(actor.session.time_to)

    if (endMins <= startMins) {
      return apiError("Jam selesai harus setelah jam mulai", 400)
    }

    if (startMins < sessionStartMins || endMins > sessionEndMins) {
      return apiError(
        `Waktu yang dipilih berada di luar jam operasional (${actor.session.time_from} - ${actor.session.time_to})`,
        400
      )
    }

    const durationMin = endMins - startMins
    if (durationMin < 30 || durationMin % 30 !== 0) {
      return apiError("Durasi jadwal harus kelipatan 30 menit", 400)
    }

    // Fetch full participant data to verify actual availability
    const fullSession = await prisma.session.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, baseline: true, overrides: true } },
          },
        },
      },
    })

    if (!fullSession) {
      return apiError("Ruang temu tidak ditemukan", 404)
    }

    const engineParticipants: EngineParticipant[] = fullSession.participants.map((p) => ({
      id: p.id,
      is_guest: !p.user_id,
      guest_name: p.guest_name,
      user_id: p.user_id,
      baseline: p.user ? parseBaselineList(p.user.baseline) : [],
      overrides: p.user ? parseOverrideList(p.user.overrides) : [],
      room_input: parseRoomInputList(p.room_input),
    }))

    const calcResult = calculateRoomSchedule(
      {
        date_from: fullSession.date_from,
        date_to: fullSession.date_to,
        time_from: fullSession.time_from,
        time_to: fullSession.time_to,
        duration_min: fullSession.duration_min,
        quorum: fullSession.quorum,
      },
      engineParticipants
    )

    // Filter heatmap slots covered by the selected interval
    const coveredSlots = calcResult.heatmap.filter(
      (slot) =>
        slot.date === input.date &&
        isTimeRangeOverlapping(slot.start, slot.end, input.start, input.end)
    )

    if (coveredSlots.length === 0) {
      return apiError("Tidak ditemukan slot waktu yang valid untuk rentang tersebut", 400)
    }

    const minAvailable = Math.min(...coveredSlots.map((s) => s.available_count))
    if (minAvailable < 2 && fullSession.participants.length >= 2) {
      return apiError(
        `Slot jadwal yang dipilih hanya dihadiri oleh ${minAvailable} peserta (minimal 2 peserta)`,
        400
      )
    }

    const lockedSlot: LockedSlot = {
      date: input.date,
      start: input.start,
      end: input.end,
      duration_min: durationMin,
      available_count: minAvailable,
      total_participants: fullSession.participants.length,
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        status: "confirmed",
        locked_slot: lockedSlot,
      },
    })

    return apiSuccess({
      message: "Jadwal berhasil dikunci secara permanen",
      session: updatedSession,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

