import { getAuthUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { parseBaselineList, parseOverrideList } from "@/lib/time-utils";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("Belum terautentikasi", 401);
    }

    const baseline = parseBaselineList(user.baseline);
    const overrides = parseOverrideList(user.overrides);

    return apiSuccess({
      baseline,
      overrides,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
