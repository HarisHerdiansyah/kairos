"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function UnauthenticatedView() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <Card className="border-border bg-card p-4">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">
            Oops! Sepertinya kamu belum terdaftar :(
          </CardTitle>
          <CardDescription>
            Bergabung terlebih dahulu untuk mengelola jadwal dan membuka sesi
            penjadwalan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pt-2">
          <Button
            size="lg"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            <LogIn className="size-4" />
            <span>Masuk dengan Google</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
