"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider basePath="/api/v1/auth">
      {children}
      <Toaster position="bottom-right" />
    </SessionProvider>
  );
}
