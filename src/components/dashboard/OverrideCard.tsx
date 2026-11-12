"use client";

import * as React from "react";
import { CalendarOff, CalendarPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { OverrideCardProps } from "@/types/dashboard";
import {
  END_TIME_OPTIONS,
  START_TIME_OPTIONS,
} from "@/lib/dashboard-constants";
import {
  initialOverrideDialogState,
  overrideDialogReducer,
} from "@/lib/dashboard-reducers";
import { DAY_NAMES, formatDateId, getTodayWibString } from "@/lib/format-ui";
import {
  getDatesInRange,
  getIsoDayOfWeek,
  timeToMinutes,
} from "@/lib/time-utils";
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

export function OverrideCard({
  baseline,
  overrides,
  onRefresh,
}: OverrideCardProps) {
  const [state, dispatch] = React.useReducer(
    overrideDialogReducer,
    initialOverrideDialogState,
  );

  const openAddBlock = () => {
    dispatch({ type: "OPEN_BLOCK", today: getTodayWibString(0) });
  };

  const openAddUnblock = () => {
    dispatch({ type: "OPEN_UNBLOCK", today: getTodayWibString(0) });
  };

  const coveredDaysInUnblockRange = React.useMemo(() => {
    if (
      !state.unblockDateFrom ||
      !state.unblockDateTo ||
      state.unblockDateTo < state.unblockDateFrom
    ) {
      return new Set<number>();
    }
    try {
      const dates = getDatesInRange(state.unblockDateFrom, state.unblockDateTo);
      return new Set(dates.map((d) => getIsoDayOfWeek(d)));
    } catch {
      return new Set<number>();
    }
  }, [state.unblockDateFrom, state.unblockDateTo]);

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_BLOCK_ERROR", error: null });

    if (!state.blockLabel.trim()) {
      dispatch({
        type: "SET_BLOCK_ERROR",
        error: "Nama kegiatan kesibukan wajib diisi.",
      });
      return;
    }
    if (state.blockDateTo < state.blockDateFrom) {
      dispatch({
        type: "SET_BLOCK_ERROR",
        error: "Tanggal selesai harus sama atau setelah tanggal mulai.",
      });
      return;
    }
    if (timeToMinutes(state.blockEnd) <= timeToMinutes(state.blockStart)) {
      dispatch({
        type: "SET_BLOCK_ERROR",
        error: "Jam selesai harus setelah jam mulai.",
      });
      return;
    }

    try {
      dispatch({ type: "SET_BLOCK_SUBMITTING", submitting: true });
      const res = await fetch("/api/v1/schedule/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "block",
          date_from: state.blockDateFrom,
          date_to: state.blockDateTo,
          start: state.blockStart,
          end: state.blockEnd,
          label: state.blockLabel.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        dispatch({
          type: "SET_BLOCK_ERROR",
          error: json.error || "Gagal menyimpan Eventual Block.",
        });
        return;
      }

      toast.success("Kesibukan insidental (Eventual Block) ditambahkan.");
      dispatch({ type: "CLOSE_MODAL" });
      await onRefresh();
    } catch {
      dispatch({
        type: "SET_BLOCK_ERROR",
        error: "Terjadi kesalahan jaringan saat menyimpan.",
      });
    } finally {
      dispatch({ type: "SET_BLOCK_SUBMITTING", submitting: false });
    }
  };

  const handleSaveUnblock = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_UNBLOCK_ERROR", error: null });

    if (state.unblockDateTo < state.unblockDateFrom) {
      dispatch({
        type: "SET_UNBLOCK_ERROR",
        error: "Tanggal selesai harus sama atau setelah tanggal mulai.",
      });
      return;
    }

    try {
      dispatch({ type: "SET_UNBLOCK_SUBMITTING", submitting: true });
      const res = await fetch("/api/v1/schedule/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "unblock",
          date_from: state.unblockDateFrom,
          date_to: state.unblockDateTo,
          baseline_id:
            state.unblockBaselineId === "ALL" ? null : state.unblockBaselineId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        dispatch({
          type: "SET_UNBLOCK_ERROR",
          error: json.error || "Gagal menyimpan Eventual Unblock.",
        });
        return;
      }

      toast.success("Libur rutinitas (Eventual Unblock) ditambahkan.");
      dispatch({ type: "CLOSE_MODAL" });
      await onRefresh();
    } catch {
      dispatch({
        type: "SET_UNBLOCK_ERROR",
        error: "Terjadi kesalahan jaringan saat menyimpan.",
      });
    } finally {
      dispatch({ type: "SET_UNBLOCK_SUBMITTING", submitting: false });
    }
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/schedule/overrides/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal menghapus jadwal insidental.");
        return;
      }
      toast.success("Jadwal insidental dihapus.");
      await onRefresh();
    } catch {
      toast.error("Gagal menghapus jadwal insidental.");
    }
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-start">
          <div>
            <CardTitle className="font-serif text-xl">
              Jadwal Insidental (Override)
            </CardTitle>
            <CardDescription className="mt-1">
              Tambahkan kesibukan dadakan (
              <span className="font-medium text-foreground">
                Eventual Block
              </span>
              ) atau liburkan rutinitas pada tanggal tertentu (
              <span className="font-medium text-foreground">
                Eventual Unblock
              </span>
              ).
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
                Gunakan tombol di atas bila Anda memiliki agenda tambahan di
                luar rutinitas atau sedang libur pada tanggal tertentu.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {overrides.map((ov) => {
                const isSameDate = ov.date_from === ov.date_to;
                const dateRangeText = isSameDate
                  ? formatDateId(ov.date_from)
                  : `${formatDateId(ov.date_from)} – ${formatDateId(ov.date_to)}`;

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
                  );
                }

                const targetBase = ov.baseline_id
                  ? baseline.find((b) => b.id === ov.baseline_id)
                  : null;

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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog 1: Add Eventual Block */}
      <Dialog
        open={state.activeModal === "block"}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: "CLOSE_MODAL" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Tambah Kesibukan Insidental (Eventual Block)
            </DialogTitle>
            <DialogDescription>
              Menambahkan blok waktu sibuk pada tanggal atau rentang tanggal
              tertentu di luar rutinitas mingguan Anda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBlock} className="space-y-4">
            {state.blockError && (
              <Alert variant="destructive">
                <AlertTitle>Tidak dapat menyimpan</AlertTitle>
                <AlertDescription>{state.blockError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="block-date-from">Dari Tanggal</Label>
                <Input
                  id="block-date-from"
                  type="date"
                  value={state.blockDateFrom}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_BLOCK_DATE_FROM",
                      value: e.target.value,
                    })
                  }
                  className="font-sans text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="block-date-to">Sampai Tanggal</Label>
                <Input
                  id="block-date-to"
                  type="date"
                  value={state.blockDateTo}
                  min={state.blockDateFrom}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_BLOCK_FIELD",
                      field: "blockDateTo",
                      value: e.target.value,
                    })
                  }
                  className="font-sans text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="block-start">Jam Mulai (WIB)</Label>
                <select
                  id="block-start"
                  value={state.blockStart}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_BLOCK_FIELD",
                      field: "blockStart",
                      value: e.target.value,
                    })
                  }
                  className="flex h-9 w-full rounded-3xl border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none focus-visible:border-ring"
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
                  value={state.blockEnd}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_BLOCK_FIELD",
                      field: "blockEnd",
                      value: e.target.value,
                    })
                  }
                  className="flex h-9 w-full rounded-3xl border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none focus-visible:border-ring"
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
                value={state.blockLabel}
                onChange={(e) =>
                  dispatch({
                    type: "SET_BLOCK_FIELD",
                    field: "blockLabel",
                    value: e.target.value,
                  })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => dispatch({ type: "CLOSE_MODAL" })}
              >
                Batal
              </Button>
              <Button type="submit" disabled={state.blockSubmitting}>
                {state.blockSubmitting
                  ? "Menyimpan..."
                  : "Simpan Eventual Block"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Add Eventual Unblock */}
      <Dialog
        open={state.activeModal === "unblock"}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: "CLOSE_MODAL" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Liburkan Rutinitas (Eventual Unblock)
            </DialogTitle>
            <DialogDescription>
              Mengabaikan satu jadwal rutin tertentu atau seluruh jadwal rutin
              pada rentang tanggal yang dipilih tanpa menghapus jadwal mingguan
              Anda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUnblock} className="space-y-4">
            {state.unblockError && (
              <Alert variant="destructive">
                <AlertTitle>Tidak dapat menyimpan</AlertTitle>
                <AlertDescription>{state.unblockError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unblock-date-from">Dari Tanggal</Label>
                <Input
                  id="unblock-date-from"
                  type="date"
                  value={state.unblockDateFrom}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_UNBLOCK_DATE_FROM",
                      value: e.target.value,
                    })
                  }
                  className="font-sans text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unblock-date-to">Sampai Tanggal</Label>
                <Input
                  id="unblock-date-to"
                  type="date"
                  value={state.unblockDateTo}
                  min={state.unblockDateFrom}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_UNBLOCK_FIELD",
                      field: "unblockDateTo",
                      value: e.target.value,
                    })
                  }
                  className="font-sans text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unblock-target">
                Jadwal Rutin yang Diliburkan
              </Label>
              <select
                id="unblock-target"
                value={state.unblockBaselineId}
                onChange={(e) =>
                  dispatch({
                    type: "SET_UNBLOCK_FIELD",
                    field: "unblockBaselineId",
                    value: e.target.value,
                  })
                }
                className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 text-sm text-foreground outline-none"
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
                Daftar di atas otomatis menampilkan jadwal rutin yang harinya
                tercakup dalam rentang tanggal pilihan Anda.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => dispatch({ type: "CLOSE_MODAL" })}
              >
                Batal
              </Button>
              <Button type="submit" disabled={state.unblockSubmitting}>
                {state.unblockSubmitting
                  ? "Menyimpan..."
                  : "Simpan Eventual Unblock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
