"use client";

import { CheckCircle2 } from "lucide-react";

import type { ConfirmedRoomViewProps } from "@/types/room";
import { formatDateId } from "@/lib/format-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticipantListCard } from "@/components/room/ParticipantListCard";

export function ConfirmedRoomView({
  room,
  participants,
}: ConfirmedRoomViewProps) {
  if (!room.locked_slot) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <Card className="border-primary/40 bg-card shadow-md">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="size-5" />
              <span className="font-sans text-xs font-semibold">
                Sesi Telah Dikunci
              </span>
            </div>
            <CardTitle className="font-serif text-2xl">
              {formatDateId(room.locked_slot.date)}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted/50 p-4">
                <span className="text-xs text-muted-foreground">
                  Waktu Pelaksanaan
                </span>
                <p className="mt-1 font-sans text-lg font-semibold text-foreground">
                  {room.locked_slot.start} – {room.locked_slot.end} WIB
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 p-4">
                <span className="text-xs text-muted-foreground">
                  Durasi Disepakati
                </span>
                <p className="mt-1 font-sans text-lg font-semibold text-foreground">
                  {room.locked_slot.duration_min} menit
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 p-4">
                <span className="text-xs text-muted-foreground">
                  Tingkat Kehadiran
                </span>
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
        <ParticipantListCard participants={participants} />
      </div>
    </div>
  );
}
