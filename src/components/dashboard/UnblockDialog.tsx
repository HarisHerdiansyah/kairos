"use client";

import { type FormEvent, useMemo } from "react";
import { toast } from "sonner";

import type { UnblockDialogProps } from "@/types/dashboard";
import { DAY_NAMES } from "@/lib/format-ui";
import { getDatesInRange, getIsoDayOfWeek } from "@/lib/time-utils";
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

export function UnblockDialog({
  state,
  baseline,
  dispatch,
  onRefresh,
}: UnblockDialogProps) {
  const coveredDaysInUnblockRange = useMemo(() => {
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

  const handleSaveUnblock = async (e: FormEvent) => {
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

      toast.success("Libur rutinitas  ditambahkan.");
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

  return (
    <Dialog
      open={state.activeModal === "unblock"}
      onOpenChange={(open) => {
        if (!open) dispatch({ type: "CLOSE_MODAL" });
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            Liburkan Rutinitas
          </DialogTitle>
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
            <Label htmlFor="unblock-target">Jadwal Rutin yang Diliburkan</Label>
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
              <option value="ALL">Seluruh jadwal rutin</option>
              {baseline
                .filter((b) => coveredDaysInUnblockRange.has(b.day))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {DAY_NAMES[b.day]} • {b.start}–{b.end} ({b.label})
                  </option>
                ))}
            </select>
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
              {state.unblockSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
