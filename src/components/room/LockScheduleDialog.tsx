"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, Lock } from "lucide-react";
import { toast } from "sonner";

import type { LockScheduleDialogProps } from "@/types/room";
import { formatDateId } from "@/lib/format-ui";
import { lockRoomScheduleApi } from "@/lib/room-api";
import { generateSubSlots } from "@/lib/scheduler-engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function LockScheduleDialog({
  open,
  room,
  recommendation,
  onOpenChange,
  onLocked,
}: LockScheduleDialogProps) {
  const [selectedSubSlotIdx, setSelectedSubSlotIdx] = useState<number>(0);
  const [lockingSchedule, setLockingSchedule] = useState(false);

  const subSlotOptions = useMemo(() => {
    if (!recommendation) return [];
    const targetDuration =
      recommendation.type === "shorter_duration"
        ? recommendation.duration_min
        : room.duration_min;
    return generateSubSlots(
      recommendation.start,
      recommendation.end,
      targetDuration,
    );
  }, [recommendation, room.duration_min]);

  const safeSubSlotIdx =
    selectedSubSlotIdx < subSlotOptions.length ? selectedSubSlotIdx : 0;

  const handleConfirmLock = async () => {
    if (!recommendation) return;
    const chosenSubSlot = subSlotOptions[safeSubSlotIdx] || {
      start: recommendation.start,
      end: recommendation.end,
      duration_min: recommendation.duration_min,
    };

    setLockingSchedule(true);
    try {
      const result = await lockRoomScheduleApi(room.id, {
        date: recommendation.date,
        start: chosenSubSlot.start,
        end: chosenSubSlot.end,
      });
      if (!result.ok) {
        toast.error(result.error || "Gagal mengunci jadwal.");
        return;
      }

      toast.success("Jadwal rapat berhasil dikunci secara permanen.");
      onOpenChange(false);
      await onLocked();
    } finally {
      setLockingSchedule(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setSelectedSubSlotIdx(0);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            Kunci dan Finalisasi Waktu Sesi
          </DialogTitle>
          <DialogDescription>
            Setelah dikunci, status ruang temu berubah menjadi{" "}
            <span className="font-medium text-foreground">Confirmed</span>{" "}
            secara permanen dan tidak dapat dibuka kembali.
          </DialogDescription>
        </DialogHeader>

        {recommendation && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/50 p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-serif text-sm font-semibold text-foreground">
                  {formatDateId(recommendation.date)}
                </span>
                <Badge variant="default" className="font-sans">
                  {recommendation.available_count}/
                  {recommendation.total_participants} hadir
                </Badge>
              </div>
              <p className="mt-1 font-sans text-muted-foreground">
                Jendela luang tersedia: {recommendation.start} –{" "}
                {recommendation.end} WIB ({recommendation.duration_min} menit)
              </p>
            </div>

            {subSlotOptions.length > 1 ? (
              <div className="space-y-2">
                <Label htmlFor="sub-slot-select">
                  Pilih Waktu Spesifik ({room.duration_min} menit):
                </Label>
                <select
                  id="sub-slot-select"
                  value={safeSubSlotIdx}
                  onChange={(e) =>
                    setSelectedSubSlotIdx(Number(e.target.value))
                  }
                  className="flex h-9 w-full rounded-3xl border border-border bg-input/50 px-3 py-1.5 font-sans text-sm text-foreground outline-none"
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
                  Slot yang akan dikunci: {recommendation.start} -{" "}
                  {recommendation.end} WIB ({recommendation.duration_min} menit)
                </span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
  );
}
