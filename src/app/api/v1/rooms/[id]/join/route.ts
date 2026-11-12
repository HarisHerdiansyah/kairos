import { resolveRoomActor } from "@/lib/auth"
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { roomJoinGuestInputSchema } from "@/types/kairos"
import { generateGuestToken, hashGuestToken } from "@/lib/guest-token"

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

    if (actor.session.status !== "open") {
      return apiError("Ruang temu sudah dikunci", 400)
    }

    // Case 1: Authenticated User
    if (actor.authUser) {
      if (actor.participant) {
        // Idempotent: already joined
        return apiSuccess(actor.participant, 200)
      }

      const participant = await prisma.sessionParticipant.create({
        data: {
          session_id: id,
          user_id: actor.authUser.id,
          room_input: [],
        },
      })

      return apiSuccess(participant, 201)
    }

    // Case 2: Guest Visitor
    // If the guest already holds a valid token matching their participant record
    if (actor.participant) {
      return apiSuccess(actor.participant, 200)
    }

    // Register a new guest participant
    const body = await request.json()
    const input = roomJoinGuestInputSchema.parse(body)

    const rawToken = generateGuestToken()
    const tokenHash = hashGuestToken(rawToken)

    const participant = await prisma.sessionParticipant.create({
      data: {
        session_id: id,
        guest_name: input.guest_name,
        guest_token_hash: tokenHash,
        room_input: [],
      },
    })

    // Return the raw token ONCE so the client can save it in localStorage
    return apiSuccess(
      {
        participant: {
          id: participant.id,
          session_id: participant.session_id,
          guest_name: participant.guest_name,
          joined_at: participant.joined_at,
        },
        guest_token: rawToken,
      },
      201
    )
  } catch (error) {
    return handleApiError(error)
  }
}

