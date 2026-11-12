import { resolveRoomActor } from "@/lib/auth"
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { roomUpdateInputSchema, RoomInputSlot, PersonalGridSlot } from "@/types/kairos"
import {
  isValidDateString,
  parseBaselineList,
  parseOverrideList,
  parseRoomInputList,
} from "@/lib/time-utils"
import {
  calculateRoomSchedule,
  EngineParticipant,
  resolvePersonalScheduleGrid,
} from "@/lib/scheduler-engine"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const actor = await resolveRoomActor(request, id)
    if (!actor) {
      return apiError("Ruang temu tidak ditemukan", 404)
    }

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                baseline: true,
                overrides: true,
              },
            },
          },
          orderBy: { joined_at: "asc" },
        },
      },
    })

    if (!session) {
      return apiError("Ruang temu tidak ditemukan", 404)
    }

    // Public list of participants (without leaking personal schedule or room_input)
    const publicParticipants = session.participants.map((p) => ({
      id: p.id,
      name: p.user ? p.user.name : p.guest_name || "Guest",
      is_guest: !p.user_id,
      is_owner: p.user_id === session.owner_id,
      joined_at: p.joined_at,
    }))

    const actorInfo = {
      is_owner: actor.isOwner,
      actor_type: actor.actorType,
      is_participant: Boolean(actor.participant),
      participant_id: actor.participant?.id || null,
      user_id: actor.authUser?.id || null,
    }

    // If room is confirmed, return immediately with locked_slot
    if (session.status === "confirmed") {
      return apiSuccess({
        room: {
          id: session.id,
          title: session.title,
          date_from: session.date_from,
          date_to: session.date_to,
          time_from: session.time_from,
          time_to: session.time_to,
          duration_min: session.duration_min,
          quorum: session.quorum,
          status: session.status,
          locked_slot: session.locked_slot,
          owner: session.owner,
          created_at: session.created_at,
        },
        actor: actorInfo,
        participants: publicParticipants,
        calculation: null,
        personal_grid: [],
        personal_room_input: [],
      })
    }

    // Format engine participants
    const engineParticipants: EngineParticipant[] = session.participants.map((p) => ({
      id: p.id,
      is_guest: !p.user_id,
      guest_name: p.guest_name,
      user_id: p.user_id,
      baseline: p.user ? parseBaselineList(p.user.baseline) : [],
      overrides: p.user ? parseOverrideList(p.user.overrides) : [],
      room_input: parseRoomInputList(p.room_input),
    }))

    // Calculate room schedule on-the-fly (without cache)
    const calculation = calculateRoomSchedule(
      {
        date_from: session.date_from,
        date_to: session.date_to,
        time_from: session.time_from,
        time_to: session.time_to,
        duration_min: session.duration_min,
        quorum: session.quorum,
      },
      engineParticipants
    )

    // Build personal schedule grid for the viewing actor
    let personalGrid: PersonalGridSlot[] = []
    let personalRoomInput: RoomInputSlot[] = []

    if (actor.participant) {
      personalRoomInput = parseRoomInputList(actor.participant.room_input)
      const myEngineData = engineParticipants.find((p) => p.id === actor.participant?.id)
      if (myEngineData) {
        personalGrid = resolvePersonalScheduleGrid(
          {
            date_from: session.date_from,
            date_to: session.date_to,
            time_from: session.time_from,
            time_to: session.time_to,
            duration_min: session.duration_min,
            quorum: session.quorum,
          },
          myEngineData
        )
      }
    } else if (actor.authUser) {
      // Authenticated user preview before explicitly joining
      personalGrid = resolvePersonalScheduleGrid(
        {
          date_from: session.date_from,
          date_to: session.date_to,
          time_from: session.time_from,
          time_to: session.time_to,
          duration_min: session.duration_min,
          quorum: session.quorum,
        },
        {
          id: "preview",
          is_guest: false,
          baseline: parseBaselineList(actor.authUser.baseline),
          overrides: parseOverrideList(actor.authUser.overrides),
          room_input: [],
        }
      )
    }

    return apiSuccess({
      room: {
        id: session.id,
        title: session.title,
        date_from: session.date_from,
        date_to: session.date_to,
        time_from: session.time_from,
        time_to: session.time_to,
        duration_min: session.duration_min,
        quorum: session.quorum,
        status: session.status,
        locked_slot: session.locked_slot,
        owner: session.owner,
        created_at: session.created_at,
      },
      actor: actorInfo,
      participants: publicParticipants,
      calculation,
      personal_grid: personalGrid,
      personal_room_input: personalRoomInput,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const actor = await resolveRoomActor(request, id)
    if (!actor) {
      return apiError("Ruang temu tidak ditemukan", 404)
    }

    if (!actor.isOwner) {
      return apiError("Hanya inisiator yang dapat mengubah parameter ruang temu", 403)
    }

    if (actor.session.status !== "open") {
      return apiError("Ruang temu yang sudah dikunci tidak dapat diubah", 400)
    }

    const participantCount = await prisma.sessionParticipant.count({
      where: { session_id: id },
    })

    if (participantCount > 1) {
      return apiError(
        "Parameter ruang temu tidak dapat diubah karena peserta lain sudah bergabung",
        400
      )
    }

    const body = await request.json()
    const input = roomUpdateInputSchema.parse(body)

    if (!isValidDateString(input.date_from)) {
      return apiError("Format tanggal mulai tidak valid", 400)
    }
    if (!isValidDateString(input.date_to)) {
      return apiError("Format tanggal selesai tidak valid", 400)
    }

    const updated = await prisma.session.update({
      where: { id },
      data: {
        title: input.title,
        date_from: input.date_from,
        date_to: input.date_to,
        time_from: input.time_from,
        time_to: input.time_to,
        duration_min: input.duration_min,
        quorum: input.quorum,
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const actor = await resolveRoomActor(request, id)
    if (!actor) {
      return apiError("Ruang temu tidak ditemukan", 404)
    }

    if (!actor.isOwner) {
      return apiError("Hanya inisiator yang dapat menghapus ruang temu", 403)
    }

    await prisma.session.delete({
      where: { id },
    })

    return apiSuccess({
      message: "Ruang temu berhasil dihapus",
      deleted_id: id,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

