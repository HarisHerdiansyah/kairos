"use client";

import type { FormEvent } from "react";
import { toast } from "sonner";

import type { BlockDialogProps } from "@/types/dashboard";
import {
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

export function BlockDialog({ state, dispatch, onRefresh }: BlockDialogProps) {
  const handleSaveBlock = async (e: FormEvent) => {
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

      toast.success("Jadwal Periodik ditambahkan.");
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

  return (
    <Dialog
      open={state.activeModal === "block"}
      onOpenChange={(open) => {
        if (!open) dispatch({ type: "CLOSE_MODAL" });
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            Tambah Jadwal Periodik
          </DialogTitle>
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
              {state.blockSubmitting ? "Menyimpan..." : "Simpan Jadwal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
