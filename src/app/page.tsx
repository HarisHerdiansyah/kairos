"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import {
  CalendarCheck2,
  Clock,
  Lock,
  LogIn,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface DemoSlot {
  time: string
  otherBusy: number
  myBaselineLabel: string | null
}

const DEMO_SLOTS: DemoSlot[] = [
  { time: "08:00 – 08:30", otherBusy: 2, myBaselineLabel: "Kuliah Algoritma" },
  { time: "08:30 – 09:00", otherBusy: 1, myBaselineLabel: "Kuliah Algoritma" },
  { time: "09:00 – 09:30", otherBusy: 0, myBaselineLabel: "Rapat Lab" },
  { time: "09:30 – 10:00", otherBusy: 0, myBaselineLabel: "Rapat Lab" },
  { time: "10:00 – 10:30", otherBusy: 0, myBaselineLabel: null },
  { time: "10:30 – 11:00", otherBusy: 0, myBaselineLabel: null },
  { time: "11:00 – 11:30", otherBusy: 3, myBaselineLabel: null },
  { time: "11:30 – 12:00", otherBusy: 2, myBaselineLabel: null },
]

export default function HomePage() {
  const router = useRouter()
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"

  const [roomInputCode, setRoomInputCode] = React.useState("")
  const [overriddenSlots, setOverriddenSlots] = React.useState<string[]>([
    "09:00 – 09:30",
    "09:30 – 10:00",
  ])

  const totalDemoParticipants = 5

  const toggleDemoOverride = (time: string) => {
    setOverriddenSlots((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    )
  }

  const handleOpenRoom = (e: React.FormEvent) => {
    e.preventDefault()
    const raw = roomInputCode.trim()
    if (!raw) return

    // Extract room ID if user pasted a full URL
    const match = raw.match(/\/room\/([A-Za-z0-9_-]+)/)
    const targetId = match ? match[1] : raw
    router.push(`/room/${targetId}`)
  }

  // Compute consecutive 5/5 free slots in demo
  const freeFullWindow = React.useMemo(() => {
    const bothOverridden =
      overriddenSlots.includes("09:00 – 09:30") &&
      overriddenSlots.includes("09:30 – 10:00")
    if (bothOverridden) {
      return {
        range: "09:00 – 11:00 WIB",
        duration: "120 menit",
        available: "5/5 peserta hadir",
      }
    }
    if (overriddenSlots.includes("09:30 – 10:00")) {
      return {
        range: "09:30 – 11:00 WIB",
        duration: "90 menit",
        available: "5/5 peserta hadir",
      }
    }
    return {
      range: "10:00 – 11:00 WIB",
      duration: "60 menit",
      available: "5/5 peserta hadir",
    }
  }, [overriddenSlots])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
      {/* Hero Section: Editorial Typography + Live Interactive Matrix */}
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-6 lg:col-span-6 lg:pt-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-1 text-xs font-medium text-foreground">
            <Clock className="size-3.5 text-primary" />
            <span>Resolusi 30 menit • Zona waktu tunggal WIB</span>
          </div>

          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Susun rutinitas mingguan sekali, temukan titik temu kelompok tanpa tanya satu per satu.
          </h1>

          <p className="max-w-[62ch] text-base leading-relaxed text-muted-foreground">
            Kairos menumpuk jadwal rutin dan pengecualian insidental seluruh peserta ke dalam satu
            peta waktu anonim. Label kegiatan pribadi Anda tidak pernah dikirim ke peserta lain—sistem
            hanya menghitung irisan waktu luang terbaik untuk rapat Anda.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg">
                  <CalendarCheck2 className="size-4" />
                  <span>Buka Dashboard Jadwal</span>
                </Button>
              </Link>
            ) : (
              <Button
                size="lg"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              >
                <LogIn className="size-4" />
                <span>Masuk dengan Google</span>
              </Button>
            )}
          </div>

          <Separator className="my-2" />

          {/* Quick Jump to Public Room */}
          <form onSubmit={handleOpenRoom} className="flex flex-col gap-2.5 sm:max-w-md">
            <label
              htmlFor="room-code-input"
              className="text-xs font-medium text-muted-foreground"
            >
              Sudah menerima tautan atau ID ruang temu? Buka langsung sebagai peserta atau Guest:
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="room-code-input"
                placeholder="Tempel tautan atau ID ruang temu..."
                value={roomInputCode}
                onChange={(e) => setRoomInputCode(e.target.value)}
                className="flex-1 font-sans text-xs"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={!roomInputCode.trim()}
              >
                Buka Ruang
              </Button>
            </div>
          </form>
        </div>

        {/* Interactive Schedule Intersection Demo */}
        <div className="lg:col-span-6">
          <Card className="border-border bg-card shadow-md">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="font-serif text-lg">
                    Simulasi Irisan Ruang Temu
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Klik blok jadwal rutin Anda di bawah untuk menguji fitur{" "}
                    <span className="font-medium text-foreground">
                      Room-Level Override (Sibuk → Tetap Hadir)
                    </span>
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-sans text-xs">
                  <Users className="mr-1 size-3" />5 Peserta • Target 60m
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-5 pt-5">
              {/* Interactive Slot Rows */}
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-12 px-2 pb-1 text-xs font-medium text-muted-foreground">
                  <span className="col-span-4">Slot (Kam, 12 Nov)</span>
                  <span className="col-span-5">Jadwal Pribadi Anda</span>
                  <span className="col-span-3 text-right">Heatmap Grup</span>
                </div>

                {DEMO_SLOTS.map((slot) => {
                  const isOverridden = overriddenSlots.includes(slot.time)
                  const isMyBusy = Boolean(slot.myBaselineLabel) && !isOverridden
                  const totalBusy = slot.otherBusy + (isMyBusy ? 1 : 0)
                  const availableCount = totalDemoParticipants - totalBusy

                  return (
                    <div
                      key={slot.time}
                      className={cn(
                        "grid grid-cols-12 items-center gap-2 rounded-2xl border px-3 py-2 text-xs transition-colors",
                        availableCount === totalDemoParticipants
                          ? "border-primary/40 bg-accent/50"
                          : "border-border bg-background"
                      )}
                    >
                      <span className="col-span-4 font-sans text-[11px] font-medium text-foreground">
                        {slot.time}
                      </span>

                      <div className="col-span-5">
                        {slot.myBaselineLabel ? (
                          <button
                            type="button"
                            onClick={() => toggleDemoOverride(slot.time)}
                            className={cn(
                              "inline-flex w-full items-center justify-between gap-1.5 rounded-xl border px-2.5 py-1 text-left text-[11px] font-medium transition-colors",
                              isOverridden
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-muted text-foreground hover:bg-accent"
                            )}
                          >
                            <span className="truncate">
                              {isOverridden
                                ? `Hadir (${slot.myBaselineLabel})`
                                : slot.myBaselineLabel}
                            </span>
                            <span className="shrink-0 font-sans text-[10px] opacity-80">
                              {isOverridden ? "Override" : "Sibuk"}
                            </span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-[11px] text-muted-foreground">
                            Luang otomatis
                          </span>
                        )}
                      </div>

                      <div className="col-span-3 flex justify-end">
                        <Badge
                          variant={
                            availableCount === totalDemoParticipants
                              ? "default"
                              : totalBusy >= 3
                                ? "destructive"
                                : "secondary"
                          }
                          className="font-sans text-[11px]"
                        >
                          {totalBusy === 0 ? "0 sibuk" : `${totalBusy} sibuk`}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Live Calculated Best Time Output */}
              <div className="rounded-2xl border border-border bg-muted/60 p-3.5">
                <div className="flex items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles className="size-3.5 text-primary" />
                    <span>Rekomendasi Best Time Teratas</span>
                  </div>
                  {overriddenSlots.length > 0 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setOverriddenSlots([])}
                    >
                      <RotateCcw className="size-3" />
                      <span>Kembalikan ke jadwal pribadi</span>
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
                  <div className="flex flex-col">
                    <span className="font-sans text-sm font-semibold text-foreground">
                      Kamis, 12 Nov • {freeFullWindow.range}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Jendela bebas berurutan: {freeFullWindow.duration}
                    </span>
                  </div>
                  <Badge variant="default" className="font-sans text-xs">
                    {freeFullWindow.available}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sequential Workflow Section (01, 02, 03) */}
      <section className="mt-16 border-t border-border pt-12">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            Tiga langkah dari jadwal pribadi ke keputusan rapat
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Dirancang agar anggota tetap tidak perlu mengisi ulang grid dari nol setiap minggu,
            sementara peserta tamu (Guest) tetap bisa bergabung tanpa membuat akun.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs font-semibold text-primary">
                  Langkah 01
                </span>
                <CalendarCheck2 className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="pt-1 font-serif text-lg">
                Atur Baseline & Override Pribadi
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Simpan jadwal rutin mingguan (Senin–Minggu) satu kali di dashboard. Bila ada rapat
              dadakan atau jadwal rutin yang diliburkan pada tanggal tertentu, cukup tambahkan{" "}
              <span className="font-medium text-foreground">Eventual Block</span> atau{" "}
              <span className="font-medium text-foreground">Eventual Unblock</span>.
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
                Bagikan Tautan Ruang Temu Anonim
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              User terdaftar langsung terisi jadwalnya secara otomatis dan cukup menandai slot
              sibuk yang bisa dikesampingkan. Pengunjung tanpa akun dapat memilih{" "}
              <span className="font-medium text-foreground">Lanjut sebagai Guest</span> dan
              menandai slot luang secara manual.
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
                Pilih Best Time & Kunci Jadwal
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Server menghitung 5 rekomendasi waktu terbaik berdasarkan kuorum dan durasiluang,
              lengkap dengan opsi toleransi bila terjadi kebuntuan. Inisiator memilih sub-slot
              spesifik dan mengunci jadwal menjadi{" "}
              <span className="font-medium text-foreground">Confirmed</span>.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
