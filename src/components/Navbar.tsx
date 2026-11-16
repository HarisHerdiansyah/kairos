"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { CalendarClock, UserCheck } from "lucide-react";
import { NavbarPopover } from "./NavbarPopover";

export function Navbar() {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);

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
            <p className="font-serif text-xl font-semibold leading-none tracking-tight">
              Kairos
            </p>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="h-9 w-36 animate-pulse rounded-3xl bg-muted" />
          )}
          {!isLoading && isAuthenticated && (
            <NavbarPopover
              trigger={
                <div className="flex items-center gap-2 rounded-3xl bg-accent px-3 py-1.5 text-sm font-medium border-primary text-primary cursor-pointer hover:bg-accent/80">
                  <UserCheck className="size-3.5" />
                  <p>{session.user.name}</p>
                </div>
              }
            />
          )}
        </div>
      </div>
    </header>
  );
}
