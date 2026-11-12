"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  CalendarOff,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Lock,
  LogIn,
  Plus,
  Trash2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { BaselineItem, LockedSlot, OverrideItem } from "@/types/kairos"
import {
  DAY_NAMES,
  formatDateId,
  getHalfHourTimeOptions,
  getTodayWibString,
} from "@/lib/format-ui"
import { getDatesInRange, getIsoDayOfWeek, timeToMinutes } from "@/lib/time-utils"

interface RoomSummary {
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
  created_at: string
  joined_at?: string
  owner_name?: string
  participant_count: number
  can_edit: boolean
  is_owner: boolean
}

const START_TIME_OPTIONS = getHalfHourTimeOptions(false) // 00:00 .. 23:30
const END_TIME_OPTIONS = getHalfHourTimeOptions(true).slice(1) // 00:30 .. 24:00
const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180, 240]

export default function DashboardPage() {
  const router = useRouter()
  const { status: authStatus } = useSession()

  const [loadingData, setLoadingData] = React.useState(true)
  const [baseline, setBaseline] = React.useState<BaselineItem[]>([])
  const [overrides, setOverrides] = React.useState<OverrideItem[]>([])
  const [ownedRooms, setOwnedRooms] = React.useState<RoomSummary[]>([])
  const [joinedRooms, setJoinedRooms] = React.useState<RoomSummary[]>([])

  // Baseline Dialog State
  const [baselineDialogOpen, setBaselineDialogOpen] = React.useState(false)
  const [editingBaselineId, setEditingBaselineId] = React.useState<string | null>(null)
  const [bDay, setBDay] = React.useState<number>(1)
  const [bStart, setBStart] = React.useState<string>("08:00")
  const [bEnd, setBEnd] = React.useState<string>("10:00")
  const [bLabel, setBLabel] = React.useState<string>("")
  const [bError, setBError] = React.useState<string | null>(null)
  const [bSubmitting, setBSubmitting] = React.useState(false)

  // Override Block Dialog State
  const [blockDialogOpen, setBlockDialogOpen] = React.useState(false)
  const [blockDateFrom, setBlockDateFrom] = React.useState<string>("")
  const [blockDateTo, setBlockDateTo] = React.useState<string>("")
  const [blockStart, setBlockStart] = React.useState<string>("13:00")
  const [blockEnd, setBlockEnd] = React.useState<string>("15:00")
  const [blockLabel, setBlockLabel] = React.useState<string>("")
  const [blockError, setBlockError] = React.useState<string | null>(null)
  const [blockSubmitting, setBlockSubmitting] = React.useState(false)

  // Override Unblock Dialog State
  const [unblockDialogOpen, setUnblockDialogOpen] = React.useState(false)
  const [unblockDateFrom, setUnblockDateFrom] = React.useState<string>("")
  const [unblockDateTo, setUnblockDateTo] = React.useState<string>("")
  const [unblockBaselineId, setUnblockBaselineId] = React.useState<string>("ALL")
  const [unblockError, setUnblockError] = React.useState<string | null>(null)
  const [unblockSubmitting, setUnblockSubmitting] = React.useState(false)

  // Create / Edit Room Dialog State
  const [roomDialogOpen, setRoomDialogOpen] = React.useState(false)
  const [editingRoomId, setEditingRoomId] = React.useState<string | null>(null)
  const [rTitle, setRTitle] = React.useState<string>("")
  const [rDateFrom, setRDateFrom] = React.useState<string>("")
  const [rDateTo, setRDateTo] = React.useState<string>("")
  const [rTimeFrom, setRTimeFrom] = React.useState<string>("08:00")
  const [rTimeTo, setRTimeTo] = React.useState<string>("17:00")
  const [rDuration, setRDuration] = React.useState<number>(60)
  const [rQuorum, setRQuorum] = React.useState<number>(2)
  const [rError, setRError] = React.useState<string | null>(null)
  const [rSubmitting, setRSubmitting] = React.useState(false)

  const fetchDashboardData = React.useCallback(async () => {
    try {
      const [schedRes, roomsRes] = await Promise.all([
        fetch("/api/v1/schedule"),
        fetch("/api/v1/rooms"),
      ])

      if (schedRes.ok) {
        const schedJson = await schedRes.json()
        if (schedJson.success) {
          setBaseline(schedJson.data.baseline || [])
          setOverrides(schedJson.data.overrides || [])
        }
      }

      if (roomsRes.ok) {
        const roomsJson = await roomsRes.json()
        if (roomsJson.success) {
          setOwnedRooms(roomsJson.data.owned_rooms || [])
          setJoinedRooms(roomsJson.data.joined_rooms || [])
        }
      }
    } catch {
      toast.error("Gagal memuat data dashboard. Periksa koneksi Anda.")
    } finally {
      setLoadingData(false)
    }
  }, [])

  React.useEffect(() => {
    if (authStatus !== "authenticated") return
    let active = true
    Promise.all([fetch("/api/v1/schedule"), fetch("/api/v1/rooms")])
      .then(async ([schedRes, roomsRes]) => {
        if (!active) return
        if (schedRes.ok) {
          const schedJson = await schedRes.json()
          if (schedJson.success && active) {
            setBaseline(schedJson.data.baseline || [])
            setOverrides(schedJson.data.overrides || [])
          }
        }
        if (roomsRes.ok) {
          const roomsJson = await roomsRes.json()
          if (roomsJson.success && active) {
            setOwnedRooms(roomsJson.data.owned_rooms || [])
            setJoinedRooms(roomsJson.data.joined_rooms || [])
          }
        }
      })
      .catch(() => {
        if (active) {
          toast.error("Gagal memuat data dashboard. Periksa koneksi Anda.")
        }
      })
      .finally(() => {
        if (active) {
          setLoadingData(false)
        }
      })
    return () => {
      active = false
    }
  }, [authStatus])

  // Open Baseline Dialog (Add vs Edit)
  const openAddBaseline = (defaultDay = 1) => {
    setEditingBaselineId(null)
    setBDay(defaultDay)
    setBStart("08:00")
    setBEnd("10:00")
    setBLabel("")
    setBError(null)
    setBaselineDialogOpen(true)
  }

  const openEditBaseline = (item: BaselineItem) => {
    setEditingBaselineId(item.id)
    setBDay(item.day)
    setBStart(item.start)
    setBEnd(item.end)
    setBLabel(item.label)
    setBError(null)
    setBaselineDialogOpen(true)
  }

  const handleSaveBaseline = async (e: React.FormEvent) => {
    e.preventDefault()
    setBError(null)

    if (!bLabel.trim()) {
      setBError("Nama kegiatan wajib diisi.")
      return
    }
    if (timeToMinutes(bEnd) <= timeToMinutes(bStart)) {
      setBError("Jam selesai harus setelah jam mulai.")
      return
    }

    try {
      setBSubmitting(true)
      const url = editingBaselineId
        ? `/api/v1/schedule/baseline/${editingBaselineId}`
        : "/api/v1/schedule/baseline"
      const method = editingBaselineId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: bDay,
          start: bStart,
          end: bEnd,
          label: bLabel.trim(),
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        setBError(json.error || "Gagal menyimpan jadwal rutin.")
        return
      }

      toast.success(
        editingBaselineId
          ? "Jadwal rutin diperbarui."
          : "Jadwal rutin ditambahkan."
      )
      setBaselineDialogOpen(false)
      await fetchDashboardData()
    } catch {
      setBError("Terjadi kesalahan jaringan saat menyimpan jadwal rutin.")
    } finally {
      setBSubmitting(false)
    }
  }

  const handleDeleteBaseline = async (id: string, label: string) => {
    try {
      const res = await fetch(`/api/v1/schedule/baseline/${id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal menghapus jadwal rutin.")
        return
      }
      toast.success(`Jadwal rutin "${label}" dihapus.`)
      await fetchDashboardData()
    } catch {
      toast.error("Gagal menghapus jadwal rutin.")
    }
  }

  // Override Block Handlers
  const openAddBlock = () => {
    const today = getTodayWibString(0)
    setBlockDateFrom(today)
    setBlockDateTo(today)
    setBlockStart("13:00")
    setBlockEnd("15:00")
    setBlockLabel("")
    setBlockError(null)
    setBlockDialogOpen(true)
  }

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setBlockError(null)

    if (!blockLabel.trim()) {
      setBlockError("Nama kegiatan kesibukan wajib diisi.")
      return
    }
    if (blockDateTo < blockDateFrom) {
      setBlockError("Tanggal selesai harus sama atau setelah tanggal mulai.")
      return
    }
    if (timeToMinutes(blockEnd) <= timeToMinutes(blockStart)) {
      setBlockError("Jam selesai harus setelah jam mulai.")
      return
    }

    try {
      setBlockSubmitting(true)
      const res = await fetch("/api/v1/schedule/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "block",
          date_from: blockDateFrom,
          date_to: blockDateTo,
          start: blockStart,
          end: blockEnd,
          label: blockLabel.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setBlockError(json.error || "Gagal menyimpan Eventual Block.")
        return
      }

      toast.success("Kesibukan insidental (Eventual Block) ditambahkan.")
      setBlockDialogOpen(false)
      await fetchDashboardData()
    } catch {
      setBlockError("Terjadi kesalahan jaringan saat menyimpan.")
    } finally {
      setBlockSubmitting(false)
    }
  }

  // Override Unblock Handlers
  const openAddUnblock = () => {
    const today = getTodayWibString(0)
    setUnblockDateFrom(today)
    setUnblockDateTo(today)
    setUnblockBaselineId("ALL")
    setUnblockError(null)
    setUnblockDialogOpen(true)
  }

  // Compute which days of the week are covered by unblockDateFrom..unblockDateTo
  const coveredDaysInUnblockRange = React.useMemo(() => {
    if (!unblockDateFrom || !unblockDateTo || unblockDateTo < unblockDateFrom) {
      return new Set<number>()
    }
    try {
      const dates = getDatesInRange(unblockDateFrom, unblockDateTo)
      return new Set(dates.map((d) => getIsoDayOfWeek(d)))
    } catch {
      return new Set<number>()
    }
  }, [unblockDateFrom, unblockDateTo])

  const handleSaveUnblock = async (e: React.FormEvent) => {
    e.preventDefault()
    setUnblockError(null)

    if (unblockDateTo < unblockDateFrom) {
      setUnblockError("Tanggal selesai harus sama atau setelah tanggal mulai.")
      return
    }

    try {
      setUnblockSubmitting(true)
      const res = await fetch("/api/v1/schedule/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "unblock",
          date_from: unblockDateFrom,
          date_to: unblockDateTo,
          baseline_id: unblockBaselineId === "ALL" ? null : unblockBaselineId,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setUnblockError(json.error || "Gagal menyimpan Eventual Unblock.")
        return
      }

      toast.success("Libur rutinitas (Eventual Unblock) ditambahkan.")
      setUnblockDialogOpen(false)
      await fetchDashboardData()
    } catch {
      setUnblockError("Terjadi kesalahan jaringan saat menyimpan.")
    } finally {
      setUnblockSubmitting(false)
    }
  }

  const handleDeleteOverride = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/schedule/overrides/${id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal menghapus jadwal insidental.")
        return
      }
      toast.success("Jadwal insidental dihapus.")
      await fetchDashboardData()
    } catch {
      toast.error("Gagal menghapus jadwal insidental.")
    }
  }

  // Room Create & Edit Handlers
  const openCreateRoom = () => {
    setEditingRoomId(null)
    setRTitle("")
    setRDateFrom(getTodayWibString(0))
    setRDateTo(getTodayWibString(4))
    setRTimeFrom("08:00")
    setRTimeTo("17:00")
    setRDuration(60)
    setRQuorum(2)
    setRError(null)
    setRoomDialogOpen(true)
  }

  const openEditRoom = (room: RoomSummary) => {
    setEditingRoomId(room.id)
    setRTitle(room.title)
    setRDateFrom(room.date_from)
    setRDateTo(room.date_to)
    setRTimeFrom(room.time_from)
    setRTimeTo(room.time_to)
    setRDuration(room.duration_min)
    setRQuorum(room.quorum)
    setRError(null)
    setRoomDialogOpen(true)
  }

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setRError(null)

    if (!rTitle.trim()) {
      setRError("Judul ruang temu wajib diisi.")
      return
    }
    if (rDateTo < rDateFrom) {
      setRError("Tanggal selesai pencarian harus sama atau setelah tanggal mulai.")
      return
    }
    const daySpanMins = timeToMinutes(rTimeTo) - timeToMinutes(rTimeFrom)
    if (daySpanMins <= 0) {
      setRError("Jam operasional selesai harus setelah jam mulai.")
      return
    }
    if (rDuration > daySpanMins) {
      setRError("Target durasi rapat tidak boleh melebihi rentang jam operasional harian.")
      return
    }
    if (rQuorum < 2) {
      setRError("Kuorum minimal adalah 2 peserta.")
      return
    }

    try {
      setRSubmitting(true)
      const url = editingRoomId ? `/api/v1/rooms/${editingRoomId}` : "/api/v1/rooms"
      const method = editingRoomId ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: rTitle.trim(),
          date_from: rDateFrom,
          date_to: rDateTo,
          time_from: rTimeFrom,
          time_to: rTimeTo,
          duration_min: Number(rDuration),
          quorum: Number(rQuorum),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setRError(json.error || "Gagal menyimpan ruang temu.")
        return
      }

      setRoomDialogOpen(false)
      if (editingRoomId) {
        toast.success("Parameter ruang temu diperbarui.")
        await fetchDashboardData()
      } else {
        toast.success("Ruang temu dibuat. Membuka halaman ruang temu...")
        router.push(`/room/${json.data.id}`)
      }
    } catch {
      setRError("Terjadi kesalahan jaringan saat menyimpan ruang temu.")
    } finally {
      setRSubmitting(false)
    }
  }

  const handleDeleteRoom = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/v1/rooms/${id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal menghapus ruang temu.")
        return
      }
      toast.success(`Ruang temu "${title}" dihapus.`)
      await fetchDashboardData()
    } catch {
      toast.error("Gagal menghapus ruang temu.")
    }
  }

  const copyRoomLink = (roomId: string) => {
    const url = `${window.location.origin}/room/${roomId}`
    navigator.clipboard.writeText(url)
    toast.success("Tautan ruang temu disalin ke papan klip.")
  }

  // Unauthenticated View
  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <Card className="border-border bg-card p-4">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">
              Masuk untuk Mengelola Jadwal Pribadi
            </CardTitle>
            <CardDescription>
              Dashboard jadwal rutin, pengecualian insidental, dan pembuatan ruang temu
              memerlukan akun terdaftar.
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
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Top Action Bar */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Dashboard Jadwal & Ruang Temu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Perubahan pada jadwal rutin dan insidental di sini otomatis diterapkan pada seluruh
            ruang temu yang masih berstatus <span className="font-medium text-foreground">Open</span>.
          </p>
        </div>
        <Button size="lg" onClick={openCreateRoom}>
          <Plus className="size-4" />
          <span>Buat ruang temu</span>
        </Button>
      </div>

      {loadingData ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <Skeleton className="h-64 w-full rounded-3xl" />
            <Skeleton className="h-48 w-full rounded-3xl" />
          </div>
          <div className="lg:col-span-5">
            <Skeleton className="h-96 w-full rounded-3xl" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Left Column: Personal Schedule (Baseline F2 & Overrides F3) */}
          <div className="flex flex-col gap-8 lg:col-span-7">
            {/* F2: Jadwal Rutin Mingguan (Baseline) */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <CardTitle className="font-serif text-xl">
                    Jadwal Rutin Mingguan (Baseline)
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Berlaku berulang setiap minggu. Label kegiatan hanya terlihat oleh Anda sendiri.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => openAddBaseline(1)}>
                  <Plus className="size-4" />
                  <span>Tambah jadwal rutin</span>
                </Button>
              </CardHeader>

              <CardContent className="divide-y divide-border pt-2">
                {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                  const dayItems = baseline.filter((b) => b.day === dayNum)
                  return (
                    <div
                      key={dayNum}
                      className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="flex items-center justify-between sm:w-28 sm:pt-1">
                        <span className="text-sm font-semibold text-foreground">
                          {DAY_NAMES[dayNum]}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openAddBaseline(dayNum)}
                          title={`Tambah kegiatan hari ${DAY_NAMES[dayNum]}`}
                          className="sm:hidden"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>

                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        {dayItems.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Tidak ada jadwal rutin — luang sepanjang hari
                          </span>
                        ) : (
                          dayItems.map((item) => (
                            <div
                              key={item.id}
                              className="group inline-flex items-center gap-2 rounded-2xl border border-border bg-muted/60 px-3 py-1.5 text-xs"
                            >
                              <span className="font-sans font-medium text-foreground">
                                {item.start}–{item.end}
                              </span>
                              <span className="font-medium text-foreground">
                                {item.label}
                              </span>
                              <div className="flex items-center gap-0.5 pl-1">
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => openEditBaseline(item)}
                                  title="Edit slot rutin"
                                >
                                  <Edit3 className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() =>
                                    handleDeleteBaseline(item.id, item.label)
                                  }
                                  title="Hapus slot rutin"
                                >
                                  <Trash2 className="size-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* F3: Jadwal Insidental (Override Block & Unblock) */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-start">
                <div>
                  <CardTitle className="font-serif text-xl">
                    Jadwal Insidental (Override)
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Tambahkan kesibukan dadakan (<span className="font-medium text-foreground">Eventual Block</span>) atau liburkan rutinitas pada tanggal tertentu (<span className="font-medium text-foreground">Eventual Unblock</span>).
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={openAddBlock}>
                    <CalendarPlus className="size-4" />
                    <span>Tambah Block</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={openAddUnblock}>
                    <CalendarOff className="size-4" />
                    <span>Liburkan Rutinitas</span>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {overrides.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                    <p className="text-sm font-medium text-foreground">
                      Belum ada pengecualian jadwal insidental
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Gunakan tombol di atas bila Anda memiliki agenda tambahan di luar rutinitas
                      atau sedang libur pada tanggal tertentu.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {overrides.map((ov) => {
                      const isSameDate = ov.date_from === ov.date_to
                      const dateRangeText = isSameDate
                        ? formatDateId(ov.date_from)
                        : `${formatDateId(ov.date_from)} – ${formatDateId(ov.date_to)}`

                      if (ov.type === "block") {
                        return (
                          <div
                            key={ov.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="destructive" className="text-[11px]">
                                  Eventual Block
                                </Badge>
                                <span className="text-sm font-semibold text-foreground">
                                  {ov.label}
                                </span>
                              </div>
                              <span className="font-sans text-xs text-muted-foreground">
                                {dateRangeText} • {ov.start}–{ov.end} WIB
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteOverride(ov.id)}
                              title="Hapus override"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        )
                      }

                      const targetBase = ov.baseline_id
                        ? baseline.find((b) => b.id === ov.baseline_id)
                        : null

                      return (
                        <div
                          key={ov.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="text-[11px]">
                                Eventual Unblock
                              </Badge>
                              <span className="text-sm font-semibold text-foreground">
                                {ov.baseline_id === null
                                  ? "Libur Seluruh Jadwal Rutin"
                                  : targetBase
                                    ? `Libur: ${targetBase.label} (${DAY_NAMES[targetBase.day]} ${targetBase.start}–${targetBase.end})`
                                    : "Libur Jadwal Rutin"}
                              </span>
                            </div>
                            <span className="font-sans text-xs text-muted-foreground">
                              {dateRangeText}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDeleteOverride(ov.id)}
                            title="Hapus override"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Room Management & History (F4 & Section 6) */}
          <div className="lg:col-span-5">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="font-serif text-xl">
                  Daftar Ruang Temu
                </CardTitle>
                <CardDescription>
                  Kelola ruang temu yang Anda inisiasi atau buka kembali ruang temu kelompok yang Anda ikuti.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4">
                <Tabs defaultValue="owned">
                  <TabsList className="mb-4 w-full">
                    <TabsTrigger value="owned" className="flex-1">
                      Dibuat oleh Saya ({ownedRooms.length})
                    </TabsTrigger>
                    <TabsTrigger value="joined" className="flex-1">
                      Diikuti ({joinedRooms.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="owned" className="space-y-3">
                    {ownedRooms.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                        <p className="text-sm font-medium text-foreground">
                          Anda belum membuat ruang temu
                        </p>
                        <p className="mt-1 mb-4 text-xs text-muted-foreground">
                          Buat ruang temu baru dan bagikan tautannya kepada anggota kelompok Anda.
                        </p>
                        <Button size="sm" onClick={openCreateRoom}>
                          <Plus className="size-4" />
                          <span>Buat ruang temu</span>
                        </Button>
                      </div>
                    ) : (
                      ownedRooms.map((room) => (
                        <div
                          key={room.id}
                          className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Link
                                href={`/room/${room.id}`}
                                className="font-serif text-base font-semibold text-foreground hover:underline"
                              >
                                {room.title}
                              </Link>
                              <div className="mt-1 flex flex-wrap items-center gap-2 font-sans text-xs text-muted-foreground">
                                <span>
                                  {formatDateId(room.date_from, false)} –{" "}
                                  {formatDateId(room.date_to, false)}
                                </span>
                                <span>•</span>
                                <span>
                                  {room.time_from}–{room.time_to}
                                </span>
                              </div>
                            </div>
                            <Badge
                              variant={room.status === "confirmed" ? "secondary" : "default"}
                            >
                              {room.status === "confirmed" ? (
                                <span className="inline-flex items-center gap-1">
                                  <Lock className="size-3" /> Confirmed
                                </span>
                              ) : (
                                "Open"
                              )}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1 font-sans">
                              <Clock className="size-3.5" />
                              Target {room.duration_min} mnt
                            </span>
                            <span className="inline-flex items-center gap-1 font-sans">
                              <Users className="size-3.5" />
                              {room.participant_count} peserta (Kuorum {room.quorum})
                            </span>
                          </div>

                          {room.status === "confirmed" && room.locked_slot && (
                            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 text-xs">
                              <CheckCircle2 className="size-4 shrink-0 text-primary" />
                              <span className="font-sans font-medium text-foreground">
                                Terkunci: {formatDateId(room.locked_slot.date)} •{" "}
                                {room.locked_slot.start}–{room.locked_slot.end} WIB
                              </span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
                            <div className="flex items-center gap-1.5">
                              <Link href={`/room/${room.id}`}>
                                <Button variant="default" size="xs">
                                  <ExternalLink className="size-3" />
                                  <span>Buka Ruang</span>
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => copyRoomLink(room.id)}
                              >
                                <Copy className="size-3" />
                                <span>Salin Tautan</span>
                              </Button>
                            </div>

                            <div className="flex items-center gap-1">
                              {room.can_edit && (
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => openEditRoom(room)}
                                  title="Ubah parameter ruang temu"
                                >
                                  <Edit3 className="size-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDeleteRoom(room.id, room.title)}
                                title="Hapus ruang temu"
                              >
                                <Trash2 className="size-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="joined" className="space-y-3">
                    {joinedRooms.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                        <p className="text-sm font-medium text-foreground">
                          Belum ada ruang temu yang diikuti
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Saat Anda membuka tautan ruang temu milik rekan Anda dalam keadaan login,
                          ruang tersebut akan tercatat di sini.
                        </p>
                      </div>
                    ) : (
                      joinedRooms.map((room) => (
                        <div
                          key={room.id}
                          className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Link
                                href={`/room/${room.id}`}
                                className="font-serif text-base font-semibold text-foreground hover:underline"
                              >
                                {room.title}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                Inisiator: {room.owner_name || "Pengguna"}
                              </p>
                            </div>
                            <Badge
                              variant={room.status === "confirmed" ? "secondary" : "default"}
                            >
                              {room.status === "confirmed" ? "Confirmed" : "Open"}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 font-sans text-xs text-muted-foreground">
                            <span>
                              {formatDateId(room.date_from, false)} –{" "}
                              {formatDateId(room.date_to, false)}
                            </span>
                            <span>•</span>
                            <span>Target {room.duration_min} mnt</span>
                            <span>•</span>
                            <span>{room.participant_count} peserta</span>
                          </div>

                          {room.status === "confirmed" && room.locked_slot && (
                            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 text-xs">
                              <CheckCircle2 className="size-4 shrink-0 text-primary" />
                              <span className="font-sans font-medium text-foreground">
                                Terkunci: {formatDateId(room.locked_slot.date)} •{" "}
                                {room.locked_slot.start}–{room.locked_slot.end} WIB
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 border-t border-border pt-2.5">
                            <Link href={`/room/${room.id}`}>
                              <Button variant="default" size="xs">
                                <ExternalLink className="size-3" />
                                <span>Buka Ruang</span>
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => copyRoomLink(room.id)}
                            >
                              <Copy className="size-3" />
                              <span>Salin Tautan</span>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Dialog 1: Add / Edit Baseline */}
      <Dialog open={baselineDialogOpen} onOpenChange={setBaselineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {editingBaselineId ? "Edit Jadwal Rutin" : "Tambah Jadwal Rutin Mingguan"}
            </DialogTitle>
            <DialogDescription>
              Slot waktu yang disimpan berlaku berulang setiap minggu dan otomatis menandai Anda
              sibuk di setiap ruang temu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBaseline} className="space-y-4">
            {bError && (
              <Alert variant="destructive">
                <AlertTitle>Tidak dapat menyimpan</AlertTitle>
                <AlertDescription>{bError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="baseline-day">Hari (Senin–Minggu)</Label>
              <select
                id="baseline-day"
                value={bDay}
                onChange={(e) => setBDay(Number(e.target.value))}
                className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:border-ring"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    {DAY_NAMES[d]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="baseline-start">Jam Mulai (WIB)</Label>
                <select
                  id="baseline-start"
                  value={bStart}
                  onChange={(e) => setBStart(e.target.value)}
                  className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none focus-visible:border-ring"
                >
                  {START_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="baseline-end">Jam Selesai (WIB)</Label>
                <select
                  id="baseline-end"
                  value={bEnd}
                  onChange={(e) => setBEnd(e.target.value)}
                  className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none focus-visible:border-ring"
                >
                  {END_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="baseline-label">Nama Kegiatan</Label>
              <Input
                id="baseline-label"
                placeholder="Contoh: Kuliah Algoritma, Rapat Divisi..."
                value={bLabel}
                onChange={(e) => setBLabel(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBaselineDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={bSubmitting}>
                {bSubmitting ? "Menyimpan..." : "Simpan jadwal rutin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Add Eventual Block */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Tambah Kesibukan Insidental (Eventual Block)
            </DialogTitle>
            <DialogDescription>
              Menambahkan blok waktu sibuk pada tanggal atau rentang tanggal tertentu di luar
              rutinitas mingguan Anda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBlock} className="space-y-4">
            {blockError && (
              <Alert variant="destructive">
                <AlertTitle>Tidak dapat menyimpan</AlertTitle>
                <AlertDescription>{blockError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="block-date-from">Dari Tanggal</Label>
                <Input
                  id="block-date-from"
                  type="date"
                  value={blockDateFrom}
                  onChange={(e) => {
                    setBlockDateFrom(e.target.value)
                    if (blockDateTo < e.target.value) {
                      setBlockDateTo(e.target.value)
                    }
                  }}
                  className="font-sans text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="block-date-to">Sampai Tanggal</Label>
                <Input
                  id="block-date-to"
                  type="date"
                  value={blockDateTo}
                  min={blockDateFrom}
                  onChange={(e) => setBlockDateTo(e.target.value)}
                  className="font-sans text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="block-start">Jam Mulai (WIB)</Label>
                <select
                  id="block-start"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none focus-visible:border-ring"
                >
                  {START_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="block-end">Jam Selesai (WIB)</Label>
                <select
                  id="block-end"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none focus-visible:border-ring"
                >
                  {END_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="block-label">Nama Kegiatan</Label>
              <Input
                id="block-label"
                placeholder="Contoh: Kunjungan Dokter, Seminar..."
                value={blockLabel}
                onChange={(e) => setBlockLabel(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBlockDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={blockSubmitting}>
                {blockSubmitting ? "Menyimpan..." : "Simpan Eventual Block"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 3: Add Eventual Unblock */}
      <Dialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Liburkan Rutinitas (Eventual Unblock)
            </DialogTitle>
            <DialogDescription>
              Mengabaikan satu jadwal rutin tertentu atau seluruh jadwal rutin pada rentang tanggal
              yang dipilih tanpa menghapus jadwal mingguan Anda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUnblock} className="space-y-4">
            {unblockError && (
              <Alert variant="destructive">
                <AlertTitle>Tidak dapat menyimpan</AlertTitle>
                <AlertDescription>{unblockError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unblock-date-from">Dari Tanggal</Label>
                <Input
                  id="unblock-date-from"
                  type="date"
                  value={unblockDateFrom}
                  onChange={(e) => {
                    setUnblockDateFrom(e.target.value)
                    if (unblockDateTo < e.target.value) {
                      setUnblockDateTo(e.target.value)
                    }
                  }}
                  className="font-sans text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unblock-date-to">Sampai Tanggal</Label>
                <Input
                  id="unblock-date-to"
                  type="date"
                  value={unblockDateTo}
                  min={unblockDateFrom}
                  onChange={(e) => setUnblockDateTo(e.target.value)}
                  className="font-sans text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unblock-target">Jadwal Rutin yang Diliburkan</Label>
              <select
                id="unblock-target"
                value={unblockBaselineId}
                onChange={(e) => setUnblockBaselineId(e.target.value)}
                className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 text-sm text-foreground outline-none focus-visible:border-ring"
              >
                <option value="ALL">
                  Seluruh jadwal rutin pada rentang tanggal ini (Seharian penuh)
                </option>
                {baseline
                  .filter((b) => coveredDaysInUnblockRange.has(b.day))
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {DAY_NAMES[b.day]} • {b.start}–{b.end} ({b.label})
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Daftar di atas otomatis menampilkan jadwal rutin yang harinya tercakup dalam
                rentang tanggal pilihan Anda.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUnblockDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={unblockSubmitting}>
                {unblockSubmitting ? "Menyimpan..." : "Simpan Eventual Unblock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 4: Create / Edit Room */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {editingRoomId ? "Ubah Parameter Ruang Temu" : "Buat Ruang Temu Baru"}
            </DialogTitle>
            <DialogDescription>
              Tentukan rentang tanggal, batas jam operasional harian, target durasi rapat, serta
              kuorum kehadiran minimal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRoom} className="space-y-4">
            {rError && (
              <Alert variant="destructive">
                <AlertTitle>Tidak dapat menyimpan ruang temu</AlertTitle>
                <AlertDescription>{rError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="room-title">Judul Rapat / Ruang Temu</Label>
              <Input
                id="room-title"
                placeholder="Contoh: Sinkronisasi Sprint Mingguan, Kerja Kelompok..."
                value={rTitle}
                onChange={(e) => setRTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="room-date-from">Dari Tanggal</Label>
                <Input
                  id="room-date-from"
                  type="date"
                  value={rDateFrom}
                  onChange={(e) => {
                    setRDateFrom(e.target.value)
                    if (rDateTo < e.target.value) {
                      setRDateTo(e.target.value)
                    }
                  }}
                  className="font-sans text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-date-to">Sampai Tanggal</Label>
                <Input
                  id="room-date-to"
                  type="date"
                  value={rDateTo}
                  min={rDateFrom}
                  onChange={(e) => setRDateTo(e.target.value)}
                  className="font-sans text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="room-time-from">Jam Mulai Grid (WIB)</Label>
                <select
                  id="room-time-from"
                  value={rTimeFrom}
                  onChange={(e) => setRTimeFrom(e.target.value)}
                  className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none focus-visible:border-ring"
                >
                  {START_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-time-to">Jam Selesai Grid (WIB)</Label>
                <select
                  id="room-time-to"
                  value={rTimeTo}
                  onChange={(e) => setRTimeTo(e.target.value)}
                  className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none focus-visible:border-ring"
                >
                  {END_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="room-duration">Target Durasi Rapat</Label>
                <select
                  id="room-duration"
                  value={rDuration}
                  onChange={(e) => setRDuration(Number(e.target.value))}
                  className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none focus-visible:border-ring"
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} menit
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="room-quorum">Kuorum Kehadiran Minimal</Label>
                <Input
                  id="room-quorum"
                  type="number"
                  min={2}
                  max={100}
                  value={rQuorum}
                  onChange={(e) => setRQuorum(Math.max(2, Number(e.target.value) || 2))}
                  className="font-sans"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoomDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={rSubmitting}>
                {rSubmitting
                  ? "Menyimpan..."
                  : editingRoomId
                    ? "Simpan perubahan"
                    : "Buat ruang temu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
