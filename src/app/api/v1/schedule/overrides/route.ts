import { getAuthUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { overrideInputSchema, OverrideItem } from "@/types/kairos";
import {
  getDatesInRange,
  getIsoDayOfWeek,
  isValidDateString,
  parseBaselineList,
  parseOverrideList,
  sortOverrides,
} from "@/lib/time-utils";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("Belum terautentikasi", 401);
    }

    const body = await request.json();
    const input = overrideInputSchema.parse(body);

    // Validate real calendar dates
    if (!isValidDateString(input.date_from)) {
      return apiError("Format tanggal mulai tidak valid", 400);
    }
    if (!isValidDateString(input.date_to)) {
      return apiError("Format tanggal selesai tidak valid", 400);
    }

    // If unblocking a specific baseline, verify baseline existence and day alignment
    if (input.type === "unblock" && input.baseline_id !== null) {
      const existingBaseline = parseBaselineList(user.baseline);
      const targetBaseline = existingBaseline.find(
        (b) => b.id === input.baseline_id,
      );

      if (!targetBaseline) {
        return apiError("Jadwal rutin dengan ID tersebut tidak ditemukan", 404);
      }

      const coveredDates = getDatesInRange(input.date_from, input.date_to);
      const hasMatchingDay = coveredDates.some(
        (dateStr) => getIsoDayOfWeek(dateStr) === targetBaseline.day,
      );

      if (!hasMatchingDay) {
        return apiError(
          "Rentang tanggal tidak mencakup hari jadwal rutin yang dipilih",
          400,
        );
      }
    }

    const newItem: OverrideItem =
      input.type === "block"
        ? {
            id: `o_${nanoid(10)}`,
            type: "block",
            date_from: input.date_from,
            date_to: input.date_to,
            start: input.start,
            end: input.end,
            label: input.label,
          }
        : {
            id: `o_${nanoid(10)}`,
            type: "unblock",
            date_from: input.date_from,
            date_to: input.date_to,
            baseline_id: input.baseline_id,
          };

    const existingOverrides = parseOverrideList(user.overrides);
    const updatedOverrides = sortOverrides([...existingOverrides, newItem]);

    await prisma.user.update({
      where: { id: user.id },
      data: { overrides: updatedOverrides },
    });

    return apiSuccess(newItem, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
