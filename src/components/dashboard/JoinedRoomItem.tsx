"use client";

import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink, Lock } from "lucide-react";

import type { RoomSummary } from "@/types/kairos";
import { formatDateId } from "@/lib/format-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface JoinedRoomItemProps {
  room: RoomSummary;
  onCopyLink: (id: string) => void;
}

export function JoinedRoomItem({ room, onCopyLink }: JoinedRoomItemProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
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
        <Badge variant={room.status === "confirmed" ? "secondary" : "default"}>
          {room.status === "confirmed" ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" /> Confirmed
            </span>
          ) : (
            "Open"
          )}
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
            <span>Buka</span>
          </Button>
        </Link>
        <Button variant="outline" size="xs" onClick={() => onCopyLink(room.id)}>
          <Copy className="size-3" />
          <span>Salin Tautan</span>
        </Button>
      </div>
    </div>
  );
}
