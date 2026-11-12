import { resolveRoomActor } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { roomAvailabilityInputSchema } from "@/types/kairos";
import {
  isValidDateString,
  sortRoomInput,
  timeToMinutes,
} from "@/lib/time-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const actor = await resolveRoomActor(request, id);
    if (!actor) {
      return apiError("Ruang temu tidak ditemukan", 404);
    }

    if (actor.session.status !== "open") {
      return apiError(
        "Ruang temu sudah dikunci, ketersediaan tidak dapat diubah",
        400,
      );
    }

    if (!actor.participant) {
      return apiError("Anda belum bergabung ke dalam ruang temu ini", 403);
    }

    const body = await request.json();
    const input = roomAvailabilityInputSchema.parse(body);

    const sessionStartMins = timeToMinutes(actor.session.time_from);
    const sessionEndMins = timeToMinutes(actor.session.time_to);

    // Validate that each submitted slot falls within room dates and operating hours
    for (const slot of input.room_input) {
      if (!isValidDateString(slot.date)) {
        return apiError(`Format tanggal slot '${slot.date}' tidak valid`, 400);
      }

      if (
        slot.date < actor.session.date_from ||
        slot.date > actor.session.date_to
      ) {
        return apiError(
          `Slot tanggal '${slot.date}' berada di luar rentang tanggal ruang temu (${actor.session.date_from} s/d ${actor.session.date_to})`,
          400,
        );
      }

      const slotStartMins = timeToMinutes(slot.start);
      const slotEndMins = timeToMinutes(slot.end);

      if (slotEndMins <= slotStartMins) {
        return apiError(
          `Jam selesai slot '${slot.end}' harus setelah jam mulai '${slot.start}'`,
          400,
        );
      }

      if (slotStartMins < sessionStartMins || slotEndMins > sessionEndMins) {
        return apiError(
          `Slot waktu ${slot.start}-${slot.end} berada di luar jam operasional (${actor.session.time_from} - ${actor.session.time_to})`,
          400,
        );
      }
    }

    const sortedInput = sortRoomInput(input.room_input);

    const updatedParticipant = await prisma.sessionParticipant.update({
      where: { id: actor.participant.id },
      data: { room_input: sortedInput },
    });

    return apiSuccess({
      message: "Ketersediaan berhasil diperbarui",
      participant_id: updatedParticipant.id,
      room_input: sortedInput,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
