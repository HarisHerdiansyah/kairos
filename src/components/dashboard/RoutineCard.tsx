"use client";

import * as React from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { BaselineItem } from "@/types/kairos";
import type { RoutineCardProps } from "@/types/dashboard";
import {
  DAYS_OF_WEEK,
  END_TIME_OPTIONS,
  START_TIME_OPTIONS,
} from "@/lib/dashboard-constants";
import {
  baselineFormReducer,
  initialBaselineFormState,
} from "@/lib/dashboard-reducers";
import { DAY_NAMES } from "@/lib/format-ui";
import { timeToMinutes } from "@/lib/time-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function RoutineCard({ baseline, onRefresh }: RoutineCardProps) {
  const [form, dispatch] = React.useReducer(
    baselineFormReducer,
    initialBaselineFormState,
  );

  const openAddBaseline = (defaultDay = 1) => {
    dispatch({ type: "OPEN_ADD", defaultDay });
  };

  const openEditBaseline = (item: BaselineItem) => {
    dispatch({ type: "OPEN_EDIT", item });
  };

  const handleSaveBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", error: null });

    if (!form.label.trim()) {
      dispatch({ type: "SET_ERROR", error: "Nama kegiatan wajib diisi." });
      return;
    }
    if (timeToMinutes(form.end) <= timeToMinutes(form.start)) {
      dispatch({
        type: "SET_ERROR",
        error: "Jam selesai harus setelah jam mulai.",
      });
      return;
    }

    try {
      dispatch({ type: "SET_SUBMITTING", submitting: true });
      const url = form.editingId
        ? `/api/v1/schedule/baseline/${form.editingId}`
        : "/api/v1/schedule/baseline";
      const method = form.editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: form.day,
          start: form.start,
          end: form.end,
          label: form.label.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        dispatch({
          type: "SET_ERROR",
          error: json.error || "Gagal menyimpan jadwal rutin.",
        });
        return;
      }

      toast.success(
        form.editingId
          ? "Jadwal rutin diperbarui."
          : "Jadwal rutin ditambahkan.",
      );
      dispatch({ type: "SET_OPEN", open: false });
      await onRefresh();
    } catch {
      dispatch({
        type: "SET_ERROR",
        error: "Terjadi kesalahan jaringan saat menyimpan jadwal rutin.",
      });
    } finally {
      dispatch({ type: "SET_SUBMITTING", submitting: false });
    }
  };

  const handleDeleteBaseline = async (id: string, label: string) => {
    try {
      const res = await fetch(`/api/v1/schedule/baseline/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal menghapus jadwal rutin.");
        return;
      }
      toast.success(`Jadwal rutin "${label}" dihapus.`);
      await onRefresh();
    } catch {
      toast.error("Gagal menghapus jadwal rutin.");
    }
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <CardTitle className="font-serif text-xl">Jadwal Rutin</CardTitle>
          </div>
          <Button onClick={() => openAddBaseline(1)}>
            <Plus className="size-4" />
            <span>Tambah</span>
          </Button>
        </CardHeader>

        <CardContent className="divide-y divide-border pt-2">
          {DAYS_OF_WEEK.map((dayNum) => {
            const dayItems = baseline.filter((b) => b.day === dayNum);
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
            );
          })}
        </CardContent>
      </Card>

      {/* Dialog: Add / Edit Baseline */}
      <Dialog
        open={form.open}
        onOpenChange={(open) => dispatch({ type: "SET_OPEN", open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {form.editingId
                ? "Edit Jadwal Rutin"
                : "Tambah Jadwal Rutin Mingguan"}
            </DialogTitle>
            <DialogDescription>
              Slot waktu yang disimpan berlaku berulang setiap minggu dan
              otomatis menandai Anda sibuk di setiap ruang temu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBaseline} className="space-y-4">
            {form.error && (
              <Alert variant="destructive">
                <AlertTitle>Tidak dapat menyimpan</AlertTitle>
                <AlertDescription>{form.error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="baseline-day">Hari (Senin–Minggu)</Label>
              <select
                id="baseline-day"
                value={form.day}
                onChange={(e) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "day",
                    value: Number(e.target.value),
                  })
                }
                className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 text-sm text-foreground outline-none"
              >
                {DAYS_OF_WEEK.map((d) => (
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
                  value={form.start}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "start",
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
                <Label htmlFor="baseline-end">Jam Selesai (WIB)</Label>
                <select
                  id="baseline-end"
                  value={form.end}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "end",
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

            <div className="space-y-1.5">
              <Label htmlFor="baseline-label">Nama Kegiatan</Label>
              <Input
                id="baseline-label"
                placeholder="Contoh: Kuliah Algoritma, Rapat Divisi..."
                value={form.label}
                onChange={(e) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "label",
                    value: e.target.value,
                  })
                }
              />
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
                {form.submitting ? "Menyimpan..." : "Simpan jadwal rutin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
