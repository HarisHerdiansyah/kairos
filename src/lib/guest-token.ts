import crypto from "crypto"
import { nanoid } from "nanoid"

/**
 * Generates a URL-safe random string for public room IDs.
 */
export function generateRoomId(length = 21): string {
  return nanoid(length)
}

/**
 * Generates a high-entropy cryptographically random token for guest participants (256-bit).
 * This raw token is sent once to the guest browser and stored in localStorage.
 */
export function generateGuestToken(): string {
  return crypto.randomBytes(32).toString("base64url")
}

/**
 * Hashes a raw guest token using SHA-256 for persistent database storage.
 */
export function hashGuestToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex")
}

/**
 * Extracts the guest token from the incoming HTTP request header `x-guest-token`.
 */
export function extractGuestToken(request: Request): string | null {
  const token = request.headers.get("x-guest-token")
  if (!token) return null
  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : null
}

