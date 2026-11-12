"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signIn, signOut, useSession } from "next-auth/react"
import { CalendarClock, LayoutDashboard, LogIn, LogOut, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function Navbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  const isAuthenticated = status === "authenticated" && Boolean(session?.user)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CalendarClock className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg font-semibold leading-none tracking-tight">
                Kairos
              </span>
              <span className="font-sans text-[11px] text-muted-foreground">
                WIB • 30m grid
              </span>
            </div>
          </Link>

          {isAuthenticated && (
            <nav className="hidden items-center gap-1 md:flex">
              <Link
                href="/dashboard"
                className={cn(
                  "inline-flex items-center gap-2 rounded-3xl px-3.5 py-1.5 text-sm font-medium transition-colors",
                  pathname?.startsWith("/dashboard")
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <LayoutDashboard className="size-4" />
                Dashboard Jadwal
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <div className="h-9 w-36 animate-pulse rounded-3xl bg-muted" />
          ) : isAuthenticated ? (
            <>
              <Link href="/dashboard" className="md:hidden">
                <Button variant="outline" size="sm">
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Button>
              </Link>
              <Badge variant="secondary" className="hidden gap-1.5 px-3 py-1 sm:inline-flex">
                <UserCheck className="size-3.5" />
                <span className="max-w-36 truncate">{session.user.name}</span>
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="size-4" />
                <span>Keluar</span>
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              <LogIn className="size-4" />
              <span>Masuk dengan Google</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

