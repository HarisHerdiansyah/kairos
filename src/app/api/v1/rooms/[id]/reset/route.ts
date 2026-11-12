import { resolveRoomActor } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const actor = await resolveRoomActor(request, id);
    if (!actor) {
      return apiError("Ruang temu tidak ditemukan", 404);
    }

    if (actor.session.status !== "open") {
      return apiError("Ruang temu sudah dikunci", 400);
    }

    if (actor.actorType !== "user" || !actor.participant) {
      return apiError(
        "Tombol 'Kembalikan ke jadwal pribadi' hanya berlaku untuk peserta terdaftar",
        403,
      );
    }

    await prisma.sessionParticipant.update({
      where: { id: actor.participant.id },
      data: { room_input: [] },
    });

    return apiSuccess({
      message:
        "Semua penyesuaian di ruang temu ini telah dikembalikan ke jadwal pribadi",
      room_input: [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
