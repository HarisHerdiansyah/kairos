"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { RoomDialogProps } from "@/types/dashboard";
import {
  DURATION_OPTIONS,
  END_TIME_OPTIONS,
  START_TIME_OPTIONS,
} from "@/lib/dashboard-constants";
import { timeToMinutes } from "@/lib/time-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RoomDialog({ form, dispatch, onRefresh }: RoomDialogProps) {
  const router = useRouter();

  const handleSaveRoom = async (e: FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", error: null });

    if (!form.title.trim()) {
      dispatch({ type: "SET_ERROR", error: "Judul sesi wajib diisi." });
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
        error: "Durasi tidak boleh melebihi rentang jam operasional harian.",
      });
      return;
    }
    if (form.quorum < 2) {
      dispatch({
        type: "SET_ERROR",
        error: "Minimal 2 peserta.",
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
          error: json.error || "Gagal menyimpan sesi.",
        });
        return;
      }

      dispatch({ type: "SET_OPEN", open: false });
      if (form.editingRoomId) {
        toast.success("Parameter sesi diperbarui.");
        await onRefresh();
      } else {
        toast.success("Sesi dibuat. Membuka halaman sesi...");
        router.push(`/room/${json.data.id}`);
      }
    } catch {
      dispatch({
        type: "SET_ERROR",
        error: "Terjadi kesalahan jaringan saat menyimpan sesi.",
      });
    } finally {
      dispatch({ type: "SET_SUBMITTING", submitting: false });
    }
  };

  return (
    <Dialog
      open={form.open}
      onOpenChange={(open) => dispatch({ type: "SET_OPEN", open })}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            {form.editingRoomId ? "Ubah Parameter Sesi" : "Buat Sesi Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSaveRoom} className="space-y-4">
          {form.error && (
            <Alert variant="destructive">
              <AlertTitle>Tidak dapat menyimpan sesi</AlertTitle>
              <AlertDescription>{form.error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="room-title">Judul sesi</Label>
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
              <Label htmlFor="room-time-from">Jam Mulai</Label>
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
              <Label htmlFor="room-time-to">Jam Selesai</Label>
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
              <Label htmlFor="room-duration">Durasi Rapat</Label>
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
              <Label htmlFor="room-quorum">Kehadiran Minimal</Label>
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
                  : "Buat sesi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
