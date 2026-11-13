"use client";

import { type FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

import type { AnonymousGateBannerProps } from "@/types/room";
import { joinRoomAsGuestApi } from "@/lib/room-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AnonymousGateBanner({
  roomId,
  onJoined,
}: AnonymousGateBannerProps) {
  const [guestNameInput, setGuestNameInput] = useState("");
  const [joiningGuest, setJoiningGuest] = useState(false);

  const handleGuestJoin = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = guestNameInput.trim();
    if (!trimmedName) {
      toast.error("Masukkan nama Anda terlebih dahulu.");
      return;
    }

    setJoiningGuest(true);
    try {
      const result = await joinRoomAsGuestApi(roomId, trimmedName);
      if (!result.ok) {
        toast.error(result.error || "Gagal bergabung sebagai Guest.");
        return;
      }

      toast.success(
        `Bergabung sebagai ${trimmedName}. Klik atau seret slot di grid untuk menandai waktu luang Anda.`,
      );
      setGuestNameInput("");
      await onJoined();
    } finally {
      setJoiningGuest(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-accent/30">
      <CardContent className="flex flex-col justify-between gap-6 pt-6 lg:flex-row lg:items-center">
        <div className="space-y-1.5">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Bergabung untuk Mengisi Ketersediaan Anda
          </h2>
          <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
            Masuk dengan Google agar grid langsung terisi otomatis dari jadwal
            pribadi Anda, atau lanjut tanpa akun sebagai{" "}
            <span className="font-medium text-foreground">Guest</span> untuk
            menandai waktu luang secara manual di browser ini.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            onClick={() => signIn("google", { callbackUrl: `/room/${roomId}` })}
          >
            <LogIn className="size-4" />
            <span>Masuk dengan Google</span>
          </Button>

          <span className="text-center text-xs text-muted-foreground">atau</span>

          <form onSubmit={handleGuestJoin} className="flex items-center gap-2">
            <Input
              placeholder="Nama Anda (Guest)..."
              value={guestNameInput}
              onChange={(e) => setGuestNameInput(e.target.value)}
              className="w-44 bg-background text-xs"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={joiningGuest || !guestNameInput.trim()}
            >
              <UserPlus className="size-4" />
              <span>{joiningGuest ? "Memproses..." : "Lanjut tanpa akun"}</span>
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
