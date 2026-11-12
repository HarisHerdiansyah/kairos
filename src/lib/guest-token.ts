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
 * Timing-safe comparison to verify a raw token against the stored SHA-256 hash.
 */
export function verifyGuestToken(token: string, expectedHash: string): boolean {
  if (!token || !expectedHash) return false
  const computedHash = hashGuestToken(token)
  
  if (computedHash.length !== expectedHash.length) return false
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, "hex"),
      Buffer.from(expectedHash, "hex")
    )
  } catch {
    return false
  }
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

