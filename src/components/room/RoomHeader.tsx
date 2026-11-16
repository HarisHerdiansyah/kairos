"use client";

import { Copy, Lock } from "lucide-react";

import type { RoomHeaderProps } from "@/types/room";
import { formatDateId } from "@/lib/format-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function RoomHeader({ room, isOwner, onCopyLink }: RoomHeaderProps) {
  const isConfirmed = room.status === "confirmed";

  return (
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
          {isOwner && (
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
            Tanggal: {formatDateId(room.date_from)} –{" "}
            {formatDateId(room.date_to)}
          </span>
          <span>•</span>
          <span>
            Jam Grid: {room.time_from}–{room.time_to} WIB
          </span>
          <span>•</span>
          <span>Target Durasi: {room.duration_min} menit</span>
          <span>•</span>
          <span>Peserta Minimal: {room.quorum}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCopyLink}>
          <Copy className="size-4" />
          <span>Salin tautan sesi</span>
        </Button>
      </div>
    </div>
  );
}
