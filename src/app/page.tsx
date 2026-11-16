"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { CalendarCheck2, Lock, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function HomePage() {
  const router = useRouter();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [roomInputCode, setRoomInputCode] = useState("");

  const handleOpenRoom = (e: FormEvent) => {
    e.preventDefault();
    const raw = roomInputCode.trim();
    if (!raw) return;

    // Extract room ID if user pasted a full URL
    const match = raw.match(/\/room\/([A-Za-z0-9_-]+)/);
    const targetId = match ? match[1] : raw;
    router.push(`/room/${targetId}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
      <div className="flex flex-col gap-6 justify-center items-center lg:pt-2">
        <h1 className="text-center font-serif text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
          Atur janji temu lebih mudah. Susun jadwalmu dan atur ketersediaanmu.
        </h1>

        <p className="text-center max-w-[62ch] text-base leading-relaxed text-muted-foreground">
          Kairos membantu kamu menyusun rutinitas dan menentukan jadwal lebih
          cepat! Buat sesi dan undang rekan satu tim untuk menentukan jadwal
          secara kolaboratif!
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button>
                <CalendarCheck2 className="size-4" />
                <span>Buka Dashboard Jadwal</span>
              </Button>
            </Link>
          ) : (
            <Button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              <LogIn className="size-4" />
              <span>Masuk dengan Google</span>
            </Button>
          )}
        </div>

        {/* Quick Jump to Public Room */}
        <form
          onSubmit={handleOpenRoom}
          className="flex flex-col gap-2.5 sm:max-w-md"
        >
          <label
            htmlFor="room-code-input"
            className="text-xs font-medium text-muted-foreground"
          >
            Atau, masuk bergabung ke dalam sesi sebagai tamu:
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="room-code-input"
              placeholder="Tempel tautan atau ID"
              value={roomInputCode}
              onChange={(e) => setRoomInputCode(e.target.value)}
              className="flex-1 font-sans text-xs"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={!roomInputCode.trim()}
            >
              Bergabung
            </Button>
          </div>
        </form>
      </div>

      {/* Sequential Workflow Section (01, 02, 03) */}
      <section className="mt-16 border-t border-border pt-12">
        <div className="mb-8">
          <h2 className="text-center font-serif text-2xl font-semibold tracking-tight text-foreground">
            Hanya tiga langkah, dari rutinitas pribadi hingga penentuan
            kolaboratif!
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs font-semibold text-primary">
                  Langkah 1
                </span>
                <CalendarCheck2 className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="pt-1 font-serif text-lg">
                Susun jadwal rutinmu terlebih dahulu
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Simpan jadwal rutin kamu satu kali di dashboard. Ada perubahan
              jadwal? Cukup ubah satu kali dan jadwal di dalam sesi diperbarui
              otomatis.
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs font-semibold text-primary">
                  Langkah 02
                </span>
                <ShieldCheck className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="pt-1 font-serif text-lg">
                Buka sesi kolaboratif dan undang rekan satu tim
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Buat sesi kolaboratif sebagai pengguna terdaftar atau bergabung
              sebagai tamu dan langsung tentukan sesi.
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs font-semibold text-primary">
                  Langkah 03
                </span>
                <Lock className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="pt-1 font-serif text-lg">
                Pilih waktu terbaik dan kunci jadwal
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Rekomendasi waktu terbaik akan muncul secara otomatis berdasarkan
              jadwal rutin dan ketersediaan rekan satu tim. Pilih waktu terbaik
              dan kunci jadwal.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
