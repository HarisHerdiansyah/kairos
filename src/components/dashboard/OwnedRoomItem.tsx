"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Lock,
  Trash2,
  Users,
} from "lucide-react";

import type { RoomSummary } from "@/types/kairos";
import { formatDateId } from "@/lib/format-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OwnedRoomItemProps {
  room: RoomSummary;
  onEdit: (room: RoomSummary) => void;
  onDelete: (id: string, title: string) => void;
  onCopyLink: (id: string) => void;
}

export function OwnedRoomItem({
  room,
  onEdit,
  onDelete,
  onCopyLink,
}: OwnedRoomItemProps) {
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

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-sans">
          <Clock className="size-3.5" />
          {room.duration_min} menit
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
              <span>Buka</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onCopyLink(room.id)}
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
              onClick={() => onEdit(room)}
              title="Ubah parameter ruang temu"
            >
              <Edit3 className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDelete(room.id, room.title)}
            title="Hapus ruang temu"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
