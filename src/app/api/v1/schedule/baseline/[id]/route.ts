import { getAuthUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { baselineInputSchema, BaselineItem } from "@/types/kairos";
import {
  findOverlappingBaseline,
  parseBaselineList,
  parseOverrideList,
  sortBaseline,
} from "@/lib/time-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return apiError("Belum terautentikasi", 401);
    }

    const body = await request.json();
    const input = baselineInputSchema.parse(body);

    const existingBaseline = parseBaselineList(user.baseline);
    const targetIndex = existingBaseline.findIndex((item) => item.id === id);

    if (targetIndex === -1) {
      return apiError("Jadwal rutin tidak ditemukan", 404);
    }

    // Check for overlap on the same day excluding current item
    const overlap = findOverlappingBaseline(input, existingBaseline, id);
    if (overlap) {
      return apiError(
        `Jadwal bertumpuk dengan kegiatan '${overlap.label}' (${overlap.start} - ${overlap.end})`,
        409,
        { overlapping_slot: overlap },
      );
    }

    const updatedItem: BaselineItem = {
      id,
      day: input.day,
      start: input.start,
      end: input.end,
      label: input.label,
    };

    existingBaseline[targetIndex] = updatedItem;
    const sortedBaseline = sortBaseline(existingBaseline);

    await prisma.user.update({
      where: { id: user.id },
      data: { baseline: sortedBaseline },
    });

    return apiSuccess(updatedItem);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return apiError("Belum terautentikasi", 401);
    }

    const existingBaseline = parseBaselineList(user.baseline);
    const existingOverrides = parseOverrideList(user.overrides);

    const hasItem = existingBaseline.some((item) => item.id === id);
    if (!hasItem) {
      return apiError("Jadwal rutin tidak ditemukan", 404);
    }

    const updatedBaseline = existingBaseline.filter((item) => item.id !== id);

    // Automatically clean up any unblock overrides referring to this deleted baseline
    const updatedOverrides = existingOverrides.filter(
      (override) =>
        !(override.type === "unblock" && override.baseline_id === id),
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        baseline: updatedBaseline,
        overrides: updatedOverrides,
      },
    });

    return apiSuccess({
      message: "Jadwal rutin berhasil dihapus",
      deleted_id: id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
