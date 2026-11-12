"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  Copy,
  Info,
  Lock,
  LogIn,
  RotateCcw,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import type {
  BestTimeRecommendation,
  HeatmapSlot,
  LockedSlot,
  PersonalGridSlot,
  RoomCalculationResult,
  RoomInputSlot,
} from "@/types/kairos"
import { formatDateId, formatShortDateHeader } from "@/lib/format-ui"
import { getDatesInRange } from "@/lib/time-utils"
import { generateDayHalfHourSlots, generateSubSlots } from "@/lib/scheduler-engine"

interface RoomDetailData {
  room: {
    id: string
    title: string
    date_from: string
    date_to: string
    time_from: string
    time_to: string
    duration_min: number
    quorum: number
    status: "open" | "confirmed"
    locked_slot: LockedSlot | null
    owner: {
      id: string
      name: string
    }
    created_at: string
  }
  actor: {
    is_owner: boolean
    actor_type: "user" | "guest" | "anonymous"
    is_participant: boolean
    participant_id: string | null
    user_id: string | null
  }
  participants: Array<{
    id: string
    name: string
    is_guest: boolean
    is_owner: boolean
    joined_at: string
  }>
  calculation: RoomCalculationResult | null
  personal_grid: PersonalGridSlot[]
  personal_room_input: RoomInputSlot[]
}

const GUEST_TOKEN_PREFIX = "kairos_guest_token_"

function RoomDetailContent() {
  const params = useParams<{ id: string }>()
  const roomId = params?.id || ""
  const { status: authStatus } = useSession()

  const [loading, setLoading] = React.useState(true)
  const [notFoundError, setNotFoundError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<RoomDetailData | null>(null)

  // Guest Join Form State
  const [guestNameInput, setGuestNameInput] = React.useState("")
  const [joiningGuest, setJoiningGuest] = React.useState(false)

  // Grid Saving / Resetting State
  const [savingSlotKey, setSavingSlotKey] = React.useState<string | null>(null)
  const [resettingGrid, setResettingGrid] = React.useState(false)

  // Grid View Mode ("combined" shows both personal control + group heatmap count)
  const [viewMode, setViewMode] = React.useState<"interactive" | "heatmap_only">(
    "interactive"
  )

  // Lock Schedule Dialog State (F9 - Option B Sub-slot Selection)
  const [lockDialogOpen, setLockDialogOpen] = React.useState(false)
  const [selectedRec, setSelectedRec] = React.useState<BestTimeRecommendation | null>(
    null
  )
  const [selectedSubSlotIdx, setSelectedSubSlotIdx] = React.useState<number>(0)
  const [lockingSchedule, setLockingSchedule] = React.useState(false)

  // Auto-join flag to avoid duplicate calls for authenticated users
  const autoJoinedRef = React.useRef(false)

  const getStoredGuestToken = React.useCallback((): string | null => {
    if (typeof window === "undefined" || !roomId) return null
    return window.localStorage.getItem(`${GUEST_TOKEN_PREFIX}${roomId}`)
  }, [roomId])

  const fetchRoomDetail = React.useCallback(
    async (silent = false) => {
      if (!roomId) return
      try {
        const guestToken = getStoredGuestToken()
        const headers: Record<string, string> = {}
        if (guestToken) {
          headers["x-guest-token"] = guestToken
        }

        const res = await fetch(`/api/v1/rooms/${roomId}`, {
          headers,
          cache: "no-store",
        })
        const json = await res.json()

        if (!res.ok || !json.success) {
          setNotFoundError(json.error || "Ruang temu tidak ditemukan.")
          return
        }

        setData(json.data)
        setNotFoundError(null)
      } catch {
        setNotFoundError("Gagal memuat data ruang temu. Periksa koneksi Anda.")
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [roomId, getStoredGuestToken]
  )

  React.useEffect(() => {
    if (authStatus === "loading" || !roomId) return
    let active = true
    const guestToken = getStoredGuestToken()
    const headers: Record<string, string> = {}
    if (guestToken) {
      headers["x-guest-token"] = guestToken
    }

    fetch(`/api/v1/rooms/${roomId}`, {
      headers,
      cache: "no-store",
    })
      .then(async (res) => {
        const json = await res.json()
        if (!active) return
        if (!res.ok || !json.success) {
          setNotFoundError(json.error || "Ruang temu tidak ditemukan.")
          return
        }
        setData(json.data)
        setNotFoundError(null)
      })
      .catch(() => {
        if (active) {
          setNotFoundError("Gagal memuat data ruang temu. Periksa koneksi Anda.")
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [authStatus, roomId, getStoredGuestToken])

  // F5: Automatically join room if visitor is a logged-in registered user and room is open
  React.useEffect(() => {
    if (
      data &&
      data.room.status === "open" &&
      data.actor.actor_type === "user" &&
      !data.actor.is_participant &&
      !autoJoinedRef.current
    ) {
      autoJoinedRef.current = true
      fetch(`/api/v1/rooms/${roomId}/join`, {
        method: "POST",
      })
        .then((res) => {
          if (res.ok) {
            fetchRoomDetail(true)
          }
        })
        .catch(() => {
          autoJoinedRef.current = false
        })
    }
  }, [data, roomId, fetchRoomDetail])

  const copyRoomLink = () => {
    const url = `${window.location.origin}/room/${roomId}`
    navigator.clipboard.writeText(url)
    toast.success("Tautan publik ruang temu disalin.")
  }

  // Handle Guest Join (F5 Guest)
  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestNameInput.trim()) {
      toast.error("Masukkan nama Anda terlebih dahulu.")
      return
    }

    try {
      setJoiningGuest(true)
      const res = await fetch(`/api/v1/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_name: guestNameInput.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal bergabung sebagai Guest.")
        return
      }

      if (json.data.guest_token) {
        window.localStorage.setItem(
          `${GUEST_TOKEN_PREFIX}${roomId}`,
          json.data.guest_token
        )
      }

      toast.success(
        `Bergabung sebagai ${guestNameInput.trim()}. Tandai slot waktu luang Anda di grid.`
      )
      setGuestNameInput("")
      await fetchRoomDetail(true)
    } catch {
      toast.error("Terjadi kesalahan jaringan saat bergabung.")
    } finally {
      setJoiningGuest(false)
    }
  }

  // Handle Slot Click on Grid (F5 User Room-Level Override vs Guest Manual Input)
  const handleSlotToggle = async (
    dateStr: string,
    slotStart: string,
    slotEnd: string,
    personalSlot: PersonalGridSlot | undefined
  ) => {
    if (!data || data.room.status !== "open" || !data.actor.is_participant) {
      return
    }

    // Registered User rule: Can ONLY toggle slots that are busy in their personal schedule
    // ("Arah penyuntingan user terdaftar: Hanya dari sibuk menjadi hadir")
    if (data.actor.actor_type === "user") {
      if (!personalSlot || personalSlot.status === "free") {
        return
      }
    }

    const slotKey = `${dateStr}_${slotStart}`
    const currentList = data.personal_room_input || []
    const exists = currentList.some(
      (item) =>
        item.date === dateStr && item.start === slotStart && item.end === slotEnd
    )

    const updatedList: RoomInputSlot[] = exists
      ? currentList.filter(
          (item) =>
            !(
              item.date === dateStr &&
              item.start === slotStart &&
              item.end === slotEnd
            )
        )
      : [...currentList, { date: dateStr, start: slotStart, end: slotEnd }]

    try {
      setSavingSlotKey(slotKey)
      const guestToken = getStoredGuestToken()
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (guestToken) {
        headers["x-guest-token"] = guestToken
      }

      const res = await fetch(`/api/v1/rooms/${roomId}/availability`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ room_input: updatedList }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal menyimpan perubahan ketersediaan.")
        return
      }

      await fetchRoomDetail(true)
    } catch {
      toast.error("Gagal memperbarui slot waktu.")
    } finally {
      setSavingSlotKey(null)
    }
  }

  // Handle Reset to Personal Schedule (F5 Registered User)
  const handleResetToPersonalSchedule = async () => {
    if (!data || data.actor.actor_type !== "user") return
    try {
      setResettingGrid(true)
      const res = await fetch(`/api/v1/rooms/${roomId}/reset`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal mengembalikan ke jadwal pribadi.")
        return
      }
      toast.success("Penyesuaian di ruang ini dikembalikan ke jadwal pribadi Anda.")
      await fetchRoomDetail(true)
    } catch {
      toast.error("Gagal mereset penyesuaian jadwal.")
    } finally {
      setResettingGrid(false)
    }
  }

  // Open Lock Schedule Dialog (F9)
  const openLockModal = (rec: BestTimeRecommendation) => {
    setSelectedRec(rec)
    setSelectedSubSlotIdx(0)
    setLockDialogOpen(true)
  }

  const subSlotOptions = React.useMemo(() => {
    if (!selectedRec || !data) return []
    const targetDuration =
      selectedRec.type === "shorter_duration"
        ? selectedRec.duration_min
        : data.room.duration_min
    return generateSubSlots(selectedRec.start, selectedRec.end, targetDuration)
  }, [selectedRec, data])

  const handleConfirmLock = async () => {
    if (!selectedRec || !data) return
    const chosenSubSlot = subSlotOptions[selectedSubSlotIdx] || {
      start: selectedRec.start,
      end: selectedRec.end,
      duration_min: selectedRec.duration_min,
    }

    try {
      setLockingSchedule(true)
      const res = await fetch(`/api/v1/rooms/${roomId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedRec.date,
          start: chosenSubSlot.start,
          end: chosenSubSlot.end,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal mengunci jadwal.")
        return
      }

      toast.success("Jadwal rapat berhasil dikunci secara permanen.")
      setLockDialogOpen(false)
      await fetchRoomDetail(false)
    } catch {
      toast.error("Terjadi kesalahan saat mengunci jadwal.")
    } finally {
      setLockingSchedule(false)
    }
  }

  // Build lookup maps for fast rendering of the matrix
  const heatmapMap = React.useMemo(() => {
    const map = new Map<string, HeatmapSlot>()
    if (!data?.calculation?.heatmap) return map
    for (const h of data.calculation.heatmap) {
      map.set(`${h.date}_${h.start}`, h)
    }
    return map
  }, [data])

  const personalMap = React.useMemo(() => {
    const map = new Map<string, PersonalGridSlot>()
    if (!data?.personal_grid) return map
    for (const p of data.personal_grid) {
      map.set(`${p.date}_${p.start}`, p)
    }
    return map
  }, [data])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Skeleton className="h-96 w-full rounded-3xl lg:col-span-8" />
          <Skeleton className="h-96 w-full rounded-3xl lg:col-span-4" />
        </div>
      </div>
    )
  }

  if (notFoundError || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Ruang temu tidak dapat dimuat</AlertTitle>
          <AlertDescription>
            {notFoundError || "Periksa kembali tautan ruang temu yang Anda buka."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const { room, actor, participants, calculation } = data
  const dates = getDatesInRange(room.date_from, room.date_to)
  const daySlots = generateDayHalfHourSlots(room.time_from, room.time_to)
  const isConfirmed = room.status === "confirmed"

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Room Header Banner */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-start">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant={isConfirmed ? "secondary" : "default"}>
              {isConfirmed ? (
                <span className="inline-flex items-center gap-1">
                  <Lock className="size-3" /> Confirmed
                </span>
              ) : (
                "Open"
              )}
            </Badge>
            <span className="font-sans text-xs text-muted-foreground">
              Inisiator: {room.owner.name}
            </span>
            {actor.is_owner && (
              <Badge variant="outline" className="text-[11px]">
                Anda Inisiator
              </Badge>
            )}
          </div>

          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {room.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-muted-foreground">
            <span>
              Tanggal: {formatDateId(room.date_from)} – {formatDateId(room.date_to)}
            </span>
            <span>•</span>
            <span>
              Jam Grid: {room.time_from}–{room.time_to} WIB
            </span>
            <span>•</span>
            <span>Target Durasi: {room.duration_min} menit</span>
            <span>•</span>
            <span>Kuorum Minimal: {room.quorum} peserta</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyRoomLink}>
            <Copy className="size-4" />
            <span>Salin tautan ruang</span>
          </Button>
        </div>
      </div>

      {/* State 1: Room is CONFIRMED (F9 Locked View) */}
      {isConfirmed && room.locked_slot ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Card className="border-primary/40 bg-card shadow-md">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="size-5" />
                  <span className="font-sans text-xs font-semibold">
                    JADWAL RAPAT TERKUNCI PERMANEN
                  </span>
                </div>
                <CardTitle className="pt-1 font-serif text-2xl">
                  {formatDateId(room.locked_slot.date)}
                </CardTitle>
                <CardDescription>
                  Ruang temu ini telah dikunci oleh inisiator ({room.owner.name}). Seluruh
                  isian peserta bersifat final dan tidak dapat diubah lagi.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-muted/50 p-4">
                    <span className="text-xs text-muted-foreground">Waktu Pelaksanaan</span>
                    <p className="mt-1 font-sans text-lg font-semibold text-foreground">
                      {room.locked_slot.start} – {room.locked_slot.end} WIB
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/50 p-4">
                    <span className="text-xs text-muted-foreground">Durasi Disepakati</span>
                    <p className="mt-1 font-sans text-lg font-semibold text-foreground">
                      {room.locked_slot.duration_min} menit
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/50 p-4">
                    <span className="text-xs text-muted-foreground">Tingkat Kehadiran</span>
                    <p className="mt-1 font-sans text-lg font-semibold text-foreground">
                      {room.locked_slot.available_count} dari{" "}
                      {room.locked_slot.total_participants} peserta
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="font-serif text-base">
                  Daftar Peserta ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <Badge
                      key={p.id}
                      variant={p.is_owner ? "default" : "secondary"}
                      className="px-3 py-1"
                    >
                      {p.name}
                      {p.is_owner
                        ? " (Inisiator)"
                        : p.is_guest
                          ? " (Guest)"
                          : ""}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* State 2: Room is OPEN (Interactive Grid + Recommendations) */
        <div className="space-y-6">
          {/* Gate Banner if Visitor Has Not Joined Yet (Anonymous) */}
          {actor.actor_type === "anonymous" && (
            <Card className="border-primary/30 bg-accent/30">
              <CardContent className="flex flex-col justify-between gap-6 pt-6 lg:flex-row lg:items-center">
                <div className="space-y-1.5">
                  <h2 className="font-serif text-lg font-semibold text-foreground">
                    Bergabung untuk Mengisi Ketersediaan Anda
                  </h2>
                  <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
                    Masuk dengan Google agar grid langsung terisi otomatis dari jadwal pribadi Anda,
                    atau lanjut tanpa akun sebagai <span className="font-medium text-foreground">Guest</span> untuk menandai waktu luang secara manual di browser ini.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    onClick={() =>
                      signIn("google", { callbackUrl: `/room/${roomId}` })
                    }
                  >
                    <LogIn className="size-4" />
                    <span>Masuk dengan Google</span>
                  </Button>

                  <span className="text-center text-xs text-muted-foreground">
                    atau
                  </span>

                  <form
                    onSubmit={handleGuestJoin}
                    className="flex items-center gap-2"
                  >
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
          )}

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Left 8 Columns: Interactive 30-Minute Time Grid & Anonymous Heatmap */}
            <div className="space-y-4 lg:col-span-8">
              <Card className="border-border bg-card">
                <CardHeader className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle className="font-serif text-lg">
                      Grid Ketersediaan & Peta Kesibukan Anonim
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      {actor.actor_type === "user" && actor.is_participant
                        ? "Jadwal pribadi Anda telah dimuat. Klik blok sibuk Anda bila ingin menandai 'Saya tetap hadir' di ruang ini."
                        : actor.actor_type === "guest" && actor.is_participant
                          ? "Grid awal kosong (dianggap sibuk). Klik slot di bawah untuk menandai waktu luang Anda."
                          : "Menampilkan jumlah peserta yang sibuk pada setiap slot 30 menit tanpa menampilkan identitas atau nama kegiatan."}
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {actor.actor_type === "user" &&
                      actor.is_participant &&
                      data.personal_room_input.length > 0 && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={handleResetToPersonalSchedule}
                          disabled={resettingGrid}
                        >
                          <RotateCcw className="size-3.5" />
                          <span>
                            {resettingGrid
                              ? "Mereset..."
                              : "Kembalikan ke jadwal pribadi"}
                          </span>
                        </Button>
                      )}

                    {actor.is_participant && (
                      <div className="inline-flex rounded-full bg-muted p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setViewMode("interactive")}
                          className={cn(
                            "rounded-full px-3 py-1 font-medium transition-colors",
                            viewMode === "interactive"
                              ? "bg-background text-foreground shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Edit & Heatmap
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("heatmap_only")}
                          className={cn(
                            "rounded-full px-3 py-1 font-medium transition-colors",
                            viewMode === "heatmap_only"
                              ? "bg-background text-foreground shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Murni Anonim
                        </button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  {/* Legend Bar */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-3.5 py-2 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-foreground">
                        Keterangan Slot:
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-3 rounded-sm border border-primary/50 bg-accent" />
                        <span>0 sibuk (Semua luang)</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-3 rounded-sm border border-border bg-background" />
                        <span>Sebagian sibuk</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-3 rounded-sm border border-destructive/40 bg-destructive/15" />
                        <span>Mayoritas/Semua sibuk</span>
                      </span>
                    </div>

                    {actor.actor_type === "user" && actor.is_participant && (
                      <span className="font-sans text-[11px] text-muted-foreground">
                        Override aktif: {data.personal_room_input.length} slot
                      </span>
                    )}
                  </div>

                  {/* Scrollable Time Grid Matrix */}
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/60">
                          <th className="sticky left-0 z-10 w-24 border-r border-border bg-muted px-3 py-2.5 font-sans text-[11px] font-semibold text-foreground">
                            Jam (WIB)
                          </th>
                          {dates.map((dateStr) => {
                            const { dayName, dateLabel } =
                              formatShortDateHeader(dateStr)
                            return (
                              <th
                                key={dateStr}
                                className="min-w-32 border-r border-border px-2.5 py-2 text-center last:border-r-0"
                              >
                                <div className="font-sans text-xs font-semibold text-foreground">
                                  {dayName}
                                </div>
                                <div className="font-sans text-[11px] font-normal text-muted-foreground">
                                  {dateLabel}
                                </div>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {daySlots.map((slot) => (
                          <tr key={slot.start} className="group">
                            <td className="sticky left-0 z-10 border-r border-border bg-card px-3 py-2 font-sans text-[11px] font-medium whitespace-nowrap text-muted-foreground">
                              {slot.start}–{slot.end}
                            </td>

                            {dates.map((dateStr) => {
                              const key = `${dateStr}_${slot.start}`
                              const hSlot = heatmapMap.get(key)
                              const pSlot = personalMap.get(key)
                              const isSaving = savingSlotKey === key

                              const busyCount = hSlot?.busy_count ?? 0
                              const totalP = hSlot?.total_participants ?? participants.length

                              // Determine anonymous heatmap surface styling using only globals.css tokens
                              const isAllFree = totalP > 0 && busyCount === 0
                              const isHighBusy =
                                totalP > 0 && busyCount >= Math.ceil(totalP / 2)

                              const canInteract =
                                viewMode === "interactive" &&
                                actor.is_participant &&
                                (actor.actor_type === "guest" ||
                                  (actor.actor_type === "user" &&
                                    pSlot &&
                                    pSlot.status !== "free"))

                              return (
                                <td
                                  key={key}
                                  className={cn(
                                    "border-r border-border p-1 align-middle transition-colors last:border-r-0",
                                    isAllFree
                                      ? "bg-accent/50"
                                      : isHighBusy
                                        ? "bg-destructive/10"
                                        : "bg-background"
                                  )}
                                >
                                  <button
                                    type="button"
                                    disabled={!canInteract || isSaving}
                                    onClick={() =>
                                      handleSlotToggle(
                                        dateStr,
                                        slot.start,
                                        slot.end,
                                        pSlot
                                      )
                                    }
                                    className={cn(
                                      "flex min-h-11 w-full flex-col justify-between rounded-xl px-2 py-1 text-left transition-all",
                                      canInteract
                                        ? "cursor-pointer hover:ring-2 hover:ring-ring/40"
                                        : "cursor-default",
                                      viewMode === "interactive" &&
                                        pSlot?.status === "overridden_free" &&
                                        "border border-primary bg-primary text-primary-foreground",
                                      viewMode === "interactive" &&
                                        actor.actor_type === "user" &&
                                        pSlot?.status === "busy" &&
                                        "border border-border bg-secondary text-secondary-foreground",
                                      viewMode === "interactive" &&
                                        actor.actor_type === "guest" &&
                                        actor.is_participant &&
                                        pSlot?.status === "free" &&
                                        "border border-primary bg-primary text-primary-foreground",
                                      viewMode === "interactive" &&
                                        actor.actor_type === "guest" &&
                                        actor.is_participant &&
                                        pSlot?.status === "busy" &&
                                        "border border-dashed border-border bg-muted/60 text-muted-foreground"
                                    )}
                                  >
                                    {/* Top Row: Anonymous Busy Metric */}
                                    <div className="flex w-full items-center justify-between gap-1">
                                      <span className="font-sans text-[10px] font-medium opacity-85">
                                        {busyCount === 0
                                          ? "0 sibuk"
                                          : `${busyCount} sibuk`}
                                      </span>
                                      {isSaving && (
                                        <span className="font-sans text-[9px]">
                                          ...
                                        </span>
                                      )}
                                    </div>

                                    {/* Bottom Row: Personal Status (Only shown in interactive mode to the owner of that schedule) */}
                                    {viewMode === "interactive" && pSlot && (
                                      <div className="mt-0.5 truncate text-[10px] font-medium">
                                        {actor.actor_type === "guest" ? (
                                          pSlot.status === "free" ? (
                                            "✓ Luang (Hadir)"
                                          ) : (
                                            "Klik jika luang"
                                          )
                                        ) : pSlot.status === "overridden_free" ? (
                                          `✓ Tetap Hadir (${pSlot.label || "Sibuk"})`
                                        ) : pSlot.status === "busy" ? (
                                          pSlot.label || "Sibuk"
                                        ) : (
                                          <span className="text-muted-foreground">
                                            Luang
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right 4 Columns: Recommendations (F7), Deadlock Handling (F8), & Participants */}
            <div className="space-y-6 lg:col-span-4">
              {/* Recommendations Card */}
              <Card className="border-border bg-card">
                <CardHeader className="border-b border-border pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-lg">
                      Rekomendasi Waktu (Best Time)
                    </CardTitle>
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <CardDescription className="text-xs">
                    Diurutkan berdasarkan peserta hadir terbanyak, durasi luang terpanjang, lalu
                    waktu paling awal.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  {calculation?.waiting_for_participants ? (
                    <Alert>
                      <Info className="size-4" />
                      <AlertTitle>Menunggu peserta lain bergabung</AlertTitle>
                      <AlertDescription className="space-y-2 text-xs">
                        <p>
                          Saat ini baru ada 1 peserta di dalam ruang temu. Bagikan tautan publik
                          agar sistem dapat menghitung irisan waktu kelompok.
                        </p>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={copyRoomLink}
                        >
                          <Copy className="size-3" />
                          <span>Salin tautan ruang</span>
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : calculation && calculation.best_times.length > 0 ? (
                    /* F7: Top 5 Best Time */
                    <div className="space-y-3">
                      {calculation.best_times.map((rec, idx) => (
                        <div
                          key={`${rec.date}_${rec.start}_${idx}`}
                          className="flex flex-col gap-2.5 rounded-2xl border border-border bg-background p-3.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-sans text-xs font-semibold text-primary">
                                #{idx + 1} Best Time
                              </span>
                              <h3 className="font-serif text-sm font-semibold text-foreground">
                                {formatDateId(rec.date)}
                              </h3>
                              <p className="font-sans text-xs font-medium text-foreground">
                                {rec.start} – {rec.end} WIB
                              </p>
                            </div>

                            <Badge variant="default" className="font-sans text-[11px]">
                              {rec.available_count}/{rec.total_participants} hadir
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                            <span className="font-sans">
                              Durasi luang: {rec.duration_min} menit
                            </span>

                            {actor.is_owner && (
                              <Button
                                size="xs"
                                onClick={() => openLockModal(rec)}
                              >
                                <Lock className="size-3" />
                                <span>Pilih & Kunci</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : calculation && calculation.deadlock.is_deadlock ? (
                    /* F8: Absolute Deadlock (<= 1 person in all slots) */
                    <Alert variant="destructive">
                      <AlertTriangle className="size-4" />
                      <AlertTitle>Deadlock — Tidak Ada Irisan Kelompok</AlertTitle>
                      <AlertDescription className="text-xs leading-relaxed">
                        Tidak ditemukan satu pun slot waktu yang dihadiri lebih dari 1 peserta
                        secara bersamaan. Peserta disarankan menandai{" "}
                        <span className="font-semibold">Tetap Hadir (Override)</span> pada beberapa
                        slot sibuk atau menambah waktu luang agar rapat dapat dijadwalkan.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    /* F8: Tolerance / Compromise Options (Partial Participants & Shorter Duration) */
                    <div className="space-y-4">
                      <Alert>
                        <AlertTriangle className="size-4" />
                        <AlertTitle>Kuorum / Durasi Penuh Belum Tercapai</AlertTitle>
                        <AlertDescription className="text-xs">
                          Belum ada jendela waktu yang memenuhi kuorum ({room.quorum} peserta)
                          sekaligus durasi penuh ({room.duration_min} menit). Berikut adalah opsi
                          toleransi yang masih dihadiri lebih dari 1 peserta:
                        </AlertDescription>
                      </Alert>

                      {/* Opsi Toleransi 1: Peserta Parsial */}
                      {calculation &&
                        calculation.deadlock.partial_options.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-foreground">
                              Opsi Peserta Parsial (Durasi Penuh ≥ {room.duration_min} mnt)
                            </h4>
                            {calculation.deadlock.partial_options.map((rec, idx) => (
                              <div
                                key={`partial_${rec.date}_${rec.start}_${idx}`}
                                className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-serif text-sm font-semibold text-foreground">
                                      {formatDateId(rec.date)}
                                    </p>
                                    <p className="font-sans text-xs text-foreground">
                                      {rec.start} – {rec.end} WIB
                                    </p>
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className="font-sans text-[11px]"
                                  >
                                    {rec.available_count}/{rec.total_participants} hadir
                                  </Badge>
                                </div>

                                <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                                  <span className="font-sans">
                                    Durasi luang: {rec.duration_min} mnt
                                  </span>
                                  {actor.is_owner && (
                                    <Button
                                      variant="secondary"
                                      size="xs"
                                      onClick={() => openLockModal(rec)}
                                    >
                                      <Lock className="size-3" />
                                      <span>Pilih & Kunci</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      {/* Opsi Toleransi 2: Durasi Lebih Singkat */}
                      {calculation &&
                        calculation.deadlock.shorter_options.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-foreground">
                              Opsi Durasi Lebih Singkat (&lt; {room.duration_min} mnt)
                            </h4>
                            {calculation.deadlock.shorter_options.map((rec, idx) => (
                              <div
                                key={`shorter_${rec.date}_${rec.start}_${idx}`}
                                className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-serif text-sm font-semibold text-foreground">
                                      {formatDateId(rec.date)}
                                    </p>
                                    <p className="font-sans text-xs text-foreground">
                                      {rec.start} – {rec.end} WIB
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="font-sans text-[11px]"
                                  >
                                    {rec.available_count}/{rec.total_participants} hadir
                                  </Badge>
                                </div>

                                <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                                  <span className="font-sans">
                                    Durasi tersedia: {rec.duration_min} mnt
                                  </span>
                                  {actor.is_owner && (
                                    <Button
                                      variant="outline"
                                      size="xs"
                                      onClick={() => openLockModal(rec)}
                                    >
                                      <Lock className="size-3" />
                                      <span>Pilih & Kunci</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Participants Card */}
              <Card className="border-border bg-card">
                <CardHeader className="border-b border-border pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-base">
                      Peserta Bergabung ({participants.length})
                    </CardTitle>
                    <Users className="size-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p) => (
                      <Badge
                        key={p.id}
                        variant={p.is_owner ? "default" : "secondary"}
                        className="px-3 py-1"
                      >
                        {p.name}
                        {p.is_owner
                          ? " (Inisiator)"
                          : p.is_guest
                            ? " (Guest)"
                            : ""}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Lock Schedule Confirmation & Sub-Slot Picker Modal (F9 - Opsi B) */}
      <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Kunci Jadwal Rapat (Final)
            </DialogTitle>
            <DialogDescription>
              Setelah dikunci, status ruang temu berubah menjadi{" "}
              <span className="font-medium text-foreground">Confirmed</span> secara permanen dan
              tidak dapat dibuka kembali.
            </DialogDescription>
          </DialogHeader>

          {selectedRec && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/50 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-sm font-semibold text-foreground">
                    {formatDateId(selectedRec.date)}
                  </span>
                  <Badge variant="default" className="font-sans">
                    {selectedRec.available_count}/{selectedRec.total_participants} hadir
                  </Badge>
                </div>
                <p className="mt-1 font-sans text-muted-foreground">
                  Jendela luang tersedia: {selectedRec.start} – {selectedRec.end} WIB (
                  {selectedRec.duration_min} menit)
                </p>
              </div>

              {subSlotOptions.length > 1 ? (
                <div className="space-y-2">
                  <Label htmlFor="sub-slot-select">
                    Pilih Sub-Waktu Spesifik ({room.duration_min} menit) di Dalam Jendela Ini:
                  </Label>
                  <select
                    id="sub-slot-select"
                    value={selectedSubSlotIdx}
                    onChange={(e) => setSelectedSubSlotIdx(Number(e.target.value))}
                    className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none focus-visible:border-ring"
                  >
                    {subSlotOptions.map((sub, idx) => (
                      <option key={`${sub.start}_${sub.end}`} value={idx}>
                        {sub.start} – {sub.end} WIB ({sub.duration_min} menit)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3.5 py-2.5 font-sans text-xs">
                  <CalendarCheck2 className="size-4 text-primary" />
                  <span>
                    Slot yang akan dikunci: {selectedRec.start} – {selectedRec.end} WIB (
                    {selectedRec.duration_min} menit)
                  </span>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLockDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmLock}
                  disabled={lockingSchedule}
                >
                  <Lock className="size-4" />
                  <span>{lockingSchedule ? "Mengunci..." : "Kunci jadwal"}</span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function RoomDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Skeleton className="h-96 w-full rounded-3xl lg:col-span-8" />
            <Skeleton className="h-96 w-full rounded-3xl lg:col-span-4" />
          </div>
        </div>
      }
    >
      <RoomDetailContent />
    </React.Suspense>
  )
}
