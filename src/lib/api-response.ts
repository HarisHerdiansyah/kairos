import { NextResponse } from "next/server"
import { ZodError } from "zod"

export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: unknown
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      success: true,
      data,
    },
    { status }
  )
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error: message,
      details,
    },
    { status }
  )
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    const formattedErrors = error.issues.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    }))
    return apiError("Validasi input gagal", 422, formattedErrors)
  }

  if (error instanceof Error) {
    return apiError(error.message, 500)
  }

  return apiError("Terjadi kesalahan internal pada server", 500)
}

