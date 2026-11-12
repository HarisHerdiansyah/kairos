import { getAuthUser } from "@/lib/auth"
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { baselineInputSchema, BaselineItem } from "@/types/kairos"
import { findOverlappingBaseline, parseBaselineList, sortBaseline } from "@/lib/time-utils"
import { nanoid } from "nanoid"

export async function POST(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return apiError("Belum terautentikasi", 401)
    }

    const body = await request.json()
    const input = baselineInputSchema.parse(body)

    const existingBaseline = parseBaselineList(user.baseline)

    // Check for overlap on the same day
    const overlap = findOverlappingBaseline(input, existingBaseline)
    if (overlap) {
      return apiError(
        `Jadwal bertumpuk dengan kegiatan '${overlap.label}' (${overlap.start} - ${overlap.end})`,
        409,
        { overlapping_slot: overlap }
      )
    }

    const newItem: BaselineItem = {
      id: `b_${nanoid(10)}`,
      day: input.day,
      start: input.start,
      end: input.end,
      label: input.label,
    }

    const updatedBaseline = sortBaseline([...existingBaseline, newItem])

    await prisma.user.update({
      where: { id: user.id },
      data: { baseline: updatedBaseline },
    })

    return apiSuccess(newItem, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

