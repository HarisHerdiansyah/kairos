import { getAuthUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { roomCreateInputSchema } from "@/types/kairos";
import { isValidDateString } from "@/lib/time-utils";
import { generateRoomId } from "@/lib/guest-token";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("Belum terautentikasi", 401);
    }

    // 1. Rooms created by user
    const ownedSessions = await prisma.session.findMany({
      where: { owner_id: user.id },
      include: {
        participants: {
          select: {
            id: true,
            user_id: true,
            guest_name: true,
            joined_at: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const owned_rooms = ownedSessions.map((s) => ({
      id: s.id,
      title: s.title,
      date_from: s.date_from,
      date_to: s.date_to,
      time_from: s.time_from,
      time_to: s.time_to,
      duration_min: s.duration_min,
      quorum: s.quorum,
      status: s.status,
      locked_slot: s.locked_slot,
      created_at: s.created_at,
      participant_count: s.participants.length,
      can_edit: s.status === "open" && s.participants.length <= 1,
      is_owner: true,
    }));

    // 2. Rooms joined by user where user is not the owner
    const participations = await prisma.sessionParticipant.findMany({
      where: {
        user_id: user.id,
        session: {
          owner_id: { not: user.id },
        },
      },
      include: {
        session: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
            participants: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: { joined_at: "desc" },
    });

    const joined_rooms = participations.map((p) => {
      const s = p.session;
      return {
        id: s.id,
        title: s.title,
        date_from: s.date_from,
        date_to: s.date_to,
        time_from: s.time_from,
        time_to: s.time_to,
        duration_min: s.duration_min,
        quorum: s.quorum,
        status: s.status,
        locked_slot: s.locked_slot,
        created_at: s.created_at,
        joined_at: p.joined_at,
        owner_name: s.owner.name,
        participant_count: s.participants.length,
        can_edit: false,
        is_owner: false,
      };
    });

    return apiSuccess({
      owned_rooms,
      joined_rooms,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("Belum terautentikasi", 401);
    }

    const body = await request.json();
    const input = roomCreateInputSchema.parse(body);

    if (!isValidDateString(input.date_from)) {
      return apiError("Format tanggal mulai tidak valid", 400);
    }
    if (!isValidDateString(input.date_to)) {
      return apiError("Format tanggal selesai tidak valid", 400);
    }

    const roomId = generateRoomId(21);

    // Create session and add initiator as the first participant
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.session.create({
        data: {
          id: roomId,
          owner_id: user.id,
          title: input.title,
          date_from: input.date_from,
          date_to: input.date_to,
          time_from: input.time_from,
          time_to: input.time_to,
          duration_min: input.duration_min,
          quorum: input.quorum,
          status: "open",
        },
      });

      await tx.sessionParticipant.create({
        data: {
          session_id: newSession.id,
          user_id: user.id,
          room_input: [],
        },
      });

      return newSession;
    });

    return apiSuccess(session, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
