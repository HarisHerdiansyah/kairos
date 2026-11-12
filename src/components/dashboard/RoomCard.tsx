"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Lock,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import type { RoomSummary } from "@/types/kairos";
import type { RoomCardProps } from "@/types/dashboard";
import {
  DURATION_OPTIONS,
  END_TIME_OPTIONS,
  START_TIME_OPTIONS,
} from "@/lib/dashboard-constants";
import {
  initialRoomFormState,
  roomFormReducer,
} from "@/lib/dashboard-reducers";
import { formatDateId, getTodayWibString } from "@/lib/format-ui";
import { timeToMinutes } from "@/lib/time-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RoomCard({
  ownedRooms,
  joinedRooms,
  onRefresh,
  ref,
}: RoomCardProps) {
  const router = useRouter();
  const [form, dispatch] = React.useReducer(
    roomFormReducer,
    initialRoomFormState,
  );

  const openCreateRoom = React.useCallback(() => {
    dispatch({
      type: "OPEN_CREATE",
      dateFrom: getTodayWibString(0),
      dateTo: getTodayWibString(4),
    });
  }, []);

  React.useImperativeHandle(
    ref,
    () => ({
      openCreateRoom,
    }),
    [openCreateRoom],
  );

  const openEditRoom = (room: RoomSummary) => {
    dispatch({ type: "OPEN_EDIT", room });
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", error: null });

    if (!form.title.trim()) {
      dispatch({ type: "SET_ERROR", error: "Judul ruang temu wajib diisi." });
      return;
    }
    if (form.dateTo < form.dateFrom) {
      dispatch({
        type: "SET_ERROR",
        error:
          "Tanggal selesai pencarian harus sama atau setelah tanggal mulai.",
      });
      return;
    }
    const daySpanMins =
      timeToMinutes(form.timeTo) - timeToMinutes(form.timeFrom);
    if (daySpanMins <= 0) {
      dispatch({
        type: "SET_ERROR",
        error: "Jam operasional selesai harus setelah jam mulai.",
      });
      return;
    }
    if (form.duration > daySpanMins) {
      dispatch({
        type: "SET_ERROR",
        error:
          "Target durasi rapat tidak boleh melebihi rentang jam operasional harian.",
      });
      return;
    }
    if (form.quorum < 2) {
      dispatch({
        type: "SET_ERROR",
        error: "Kuorum minimal adalah 2 peserta.",
      });
      return;
    }

    try {
      dispatch({ type: "SET_SUBMITTING", submitting: true });
      const url = form.editingRoomId
        ? `/api/v1/rooms/${form.editingRoomId}`
        : "/api/v1/rooms";
      const method = form.editingRoomId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          date_from: form.dateFrom,
          date_to: form.dateTo,
          time_from: form.timeFrom,
          time_to: form.timeTo,
          duration_min: Number(form.duration),
          quorum: Number(form.quorum),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        dispatch({
          type: "SET_ERROR",
          error: json.error || "Gagal menyimpan ruang temu.",
        });
        return;
      }

      dispatch({ type: "SET_OPEN", open: false });
      if (form.editingRoomId) {
        toast.success("Parameter ruang temu diperbarui.");
        await onRefresh();
      } else {
        toast.success("Ruang temu dibuat. Membuka halaman ruang temu...");
        router.push(`/room/${json.data.id}`);
      }
    } catch {
      dispatch({
        type: "SET_ERROR",
        error: "Terjadi kesalahan jaringan saat menyimpan ruang temu.",
      });
    } finally {
      dispatch({ type: "SET_SUBMITTING", submitting: false });
    }
  };

  const handleDeleteRoom = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/v1/rooms/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal menghapus ruang temu.");
        return;
      }
      toast.success(`Ruang temu "${title}" dihapus.`);
      await onRefresh();
    } catch {
      toast.error("Gagal menghapus ruang temu.");
    }
  };

  const copyRoomLink = (roomId: string) => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success("Tautan ruang temu disalin ke papan klip.");
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="font-serif text-xl">
            Daftar Ruang Temu
          </CardTitle>
          <CardDescription>
            Kelola ruang temu yang Anda inisiasi atau buka kembali ruang temu
            kelompok yang Anda ikuti.
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
                    Buat ruang temu baru dan bagikan tautannya kepada anggota
                    kelompok Anda.
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
                        variant={
                          room.status === "confirmed" ? "secondary" : "default"
                        }
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
                    Saat Anda membuka tautan ruang temu milik rekan Anda dalam
                    keadaan login, ruang tersebut akan tercatat di sini.
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
                        variant={
                          room.status === "confirmed" ? "secondary" : "default"
                        }
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

      {/* Dialog: Create / Edit Room */}
      <Dialog
        open={form.open}
        onOpenChange={(open) => dispatch({ type: "SET_OPEN", open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {form.editingRoomId
                ? "Ubah Parameter Ruang Temu"
                : "Buat Ruang Temu Baru"}
            </DialogTitle>
            <DialogDescription>
              Tentukan rentang tanggal, batas jam operasional harian, target
              durasi rapat, serta kuorum kehadiran minimal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRoom} className="space-y-4">
            {form.error && (
              <Alert variant="destructive">
                <AlertTitle>Tidak dapat menyimpan ruang temu</AlertTitle>
                <AlertDescription>{form.error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="room-title">Judul Rapat / Ruang Temu</Label>
              <Input
                id="room-title"
                placeholder="Contoh: Sinkronisasi Sprint Mingguan, Kerja Kelompok..."
                value={form.title}
                onChange={(e) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "title",
                    value: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="room-date-from">Dari Tanggal</Label>
                <Input
                  id="room-date-from"
                  type="date"
                  value={form.dateFrom}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_DATE_FROM",
                      value: e.target.value,
                    })
                  }
                  className="font-sans text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-date-to">Sampai Tanggal</Label>
                <Input
                  id="room-date-to"
                  type="date"
                  value={form.dateTo}
                  min={form.dateFrom}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "dateTo",
                      value: e.target.value,
                    })
                  }
                  className="font-sans text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="room-time-from">Jam Mulai Grid (WIB)</Label>
                <select
                  id="room-time-from"
                  value={form.timeFrom}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "timeFrom",
                      value: e.target.value,
                    })
                  }
                  className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none"
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
                  value={form.timeTo}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "timeTo",
                      value: e.target.value,
                    })
                  }
                  className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none"
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
                  value={form.duration}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "duration",
                      value: Number(e.target.value),
                    })
                  }
                  className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none"
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
                  value={form.quorum}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "quorum",
                      value: Math.max(2, Number(e.target.value) || 2),
                    })
                  }
                  className="font-sans"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => dispatch({ type: "SET_OPEN", open: false })}
              >
                Batal
              </Button>
              <Button type="submit" disabled={form.submitting}>
                {form.submitting
                  ? "Menyimpan..."
                  : form.editingRoomId
                    ? "Simpan perubahan"
                    : "Buat ruang temu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
