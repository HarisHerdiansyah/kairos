import { getAuthUser } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/api-response"

export async function GET() {
  const user = await getAuthUser()

  if (!user) {
    return apiError("Belum terautentikasi", 401)
  }

  return apiSuccess({
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
  })
}

