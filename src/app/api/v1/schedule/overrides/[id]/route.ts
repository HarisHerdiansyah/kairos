import { getAuthUser } from "@/lib/auth"
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { parseOverrideList } from "@/lib/time-utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return apiError("Belum terautentikasi", 401)
    }

    const existingOverrides = parseOverrideList(user.overrides)
    const hasItem = existingOverrides.some((item) => item.id === id)

    if (!hasItem) {
      return apiError("Jadwal insidental tidak ditemukan", 404)
    }

    const updatedOverrides = existingOverrides.filter((item) => item.id !== id)

    await prisma.user.update({
      where: { id: user.id },
      data: { overrides: updatedOverrides },
    })

    return apiSuccess({
      message: "Jadwal insidental berhasil dihapus",
      deleted_id: id,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

