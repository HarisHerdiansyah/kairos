import { NextAuthOptions, getServerSession } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import { extractGuestToken, hashGuestToken } from "@/lib/guest-token"
import type { User, Session as DbSession, SessionParticipant } from "@prisma/client"

// Ensure NextAuth uses the /api/v1/auth base path
if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("/api/v1/auth")) {
  process.env.NEXTAUTH_URL = `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/api/v1/auth`
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && account.provider === "google") {
        const googleId = account.providerAccountId
        const email = user?.email || token.email || ""
        const name = user?.name || token.name || "User"

        // Upsert user into database to ensure local user id exists
        const dbUser = await prisma.user.upsert({
          where: { google_id: googleId },
          update: {
            email,
            name,
          },
          create: {
            google_id: googleId,
            email,
            name,
            baseline: [],
            overrides: [],
          },
        })

        token.userId = dbUser.id
        token.googleId = googleId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) || ""
        session.user.google_id = (token.googleId as string) || ""
      }
      return session
    },
  },
  pages: {
    signIn: "/",
  },
}

/**
 * Gets the current NextAuth session on the server.
 */
async function getAuthSession() {
  return getServerSession(authOptions)
}

/**
 * Fetches the currently authenticated user from the database.
 */
export async function getAuthUser(): Promise<User | null> {
  const session = await getAuthSession()
  if (!session?.user?.id) return null

  return prisma.user.findUnique({
    where: { id: session.user.id },
  })
}

interface RoomActorResult {
  session: DbSession
  isOwner: boolean
  authUser: User | null
  participant: SessionParticipant | null
  actorType: "user" | "guest" | "anonymous"
}

/**
 * Resolves the caller's identity and participant status for a given room.
 * Performs all authorization and token matching securely on the server.
 */
export async function resolveRoomActor(
  request: Request,
  sessionId: string
): Promise<RoomActorResult | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  })

  if (!session) return null

  // 1. Check if caller is an authenticated user
  const authUser = await getAuthUser()

  if (authUser) {
    const isOwner = session.owner_id === authUser.id
    const participant = await prisma.sessionParticipant.findUnique({
      where: {
        session_id_user_id: {
          session_id: sessionId,
          user_id: authUser.id,
        },
      },
    })

    return {
      session,
      isOwner,
      authUser,
      participant,
      actorType: "user",
    }
  }

  // 2. Check if caller is a valid guest with a matching token
  const guestToken = extractGuestToken(request)
  if (guestToken) {
    const tokenHash = hashGuestToken(guestToken)
    const participant = await prisma.sessionParticipant.findFirst({
      where: {
        session_id: sessionId,
        guest_token_hash: tokenHash,
      },
    })

    if (participant) {
      return {
        session,
        isOwner: false,
        authUser: null,
        participant,
        actorType: "guest",
      }
    }
  }

  // 3. Unauthenticated / anonymous visitor
  return {
    session,
    isOwner: false,
    authUser: null,
    participant: null,
    actorType: "anonymous",
  }
}
