"use client";

import { CheckCircle2, Info, Loader2, MousePointerClick } from "lucide-react";

import type { GridInspectorBarProps } from "@/types/room";
import { formatDateId } from "@/lib/format-ui";
import {
  getDefaultHintText,
  getPersonalInspectorText,
} from "@/lib/room-grid-utils";
import { Badge } from "@/components/ui/badge";

export function GridInspectorBar({
  hoveredSlot,
  actor,
  viewMode,
  quorum,
  totalParticipants,
  overrideCount,
  savingBatch,
}: GridInspectorBarProps) {
  const personalText = hoveredSlot
    ? getPersonalInspectorText(hoveredSlot, actor)
    : null;
  const meetsQuorum =
    hoveredSlot !== null &&
    hoveredSlot.totalParticipants > 0 &&
    hoveredSlot.availableCount >= quorum;

  return (
    <div className="mb-4 space-y-2.5 rounded-2xl border border-border bg-muted/35 p-3 text-xs">
      {/* Row 1: Timeful Color Scale & Personal Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-foreground">
            Kepadatan Hadir:
          </span>

          <div className="inline-flex items-center gap-1.5">
            <span className="font-sans text-[11px] text-muted-foreground">
              0/{totalParticipants}
            </span>
            <div className="flex items-center overflow-hidden rounded-md border border-border">
              <span
                className="h-3.5 w-5 bg-background"
                title="0% peserta luang"
              />
              <span
                className="h-3.5 w-5 bg-chart-1/20"
                title="~25% peserta luang"
              />
              <span
                className="h-3.5 w-5 bg-chart-1/45"
                title="~50% peserta luang"
              />
              <span
                className="h-3.5 w-5 bg-chart-1/75"
                title="~75% peserta luang"
              />
              <span
                className="h-3.5 w-5 bg-chart-1"
                title="100% peserta luang"
              />
            </div>
            <span className="font-sans text-[11px] font-medium text-foreground">
              {totalParticipants}/{totalParticipants} luang
            </span>
          </div>

          {viewMode === "interactive" &&
            actor.is_participant &&
            actor.actor_type === "user" && (
              <div className="flex flex-wrap items-center gap-3 border-l border-border pl-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded-xs border-l-3 border-destructive bg-secondary" />
                  <span className="text-[11px] text-muted-foreground">
                    Jadwal Sibuk Anda
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded-xs border-l-3 border-primary bg-chart-1/85" />
                  <span className="text-[11px] text-muted-foreground">
                    Override Tetap Hadir
                  </span>
                </span>
              </div>
            )}

          {viewMode === "interactive" &&
            actor.is_participant &&
            actor.actor_type === "guest" && (
              <div className="flex items-center gap-2 border-l border-border pl-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded-xs border-l-3 border-primary bg-chart-1/60" />
                  <span className="text-[11px] text-muted-foreground">
                    Pilihan Waktu Luang Anda
                  </span>
                </span>
              </div>
            )}
        </div>

        <div className="flex items-center gap-2">
          {savingBatch && (
            <span className="inline-flex items-center gap-1.5 font-sans text-[11px] font-medium text-primary">
              <Loader2 className="size-3 animate-spin" />
              Menyimpan...
            </span>
          )}
          {actor.actor_type === "user" && actor.is_participant && (
            <span className="font-sans text-[11px] text-muted-foreground">
              Override aktif: {overrideCount} slot
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Live Hover Slot Inspector */}
      <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
        {hoveredSlot ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-serif font-semibold text-foreground">
                {formatDateId(hoveredSlot.date)}
              </span>
              <span className="font-sans font-medium text-foreground">
                {hoveredSlot.start}–{hoveredSlot.end} WIB
              </span>
              <Badge
                variant={meetsQuorum ? "default" : "secondary"}
                className="font-sans text-[11px]"
              >
                {hoveredSlot.availableCount}/{hoveredSlot.totalParticipants}{" "}
                luang ({hoveredSlot.busyCount} sibuk)
              </Badge>
              {meetsQuorum && (
                <span className="inline-flex items-center gap-1 font-sans text-[11px] font-medium text-primary">
                  <CheckCircle2 className="size-3.5" />
                  Memenuhi kuorum
                </span>
              )}
            </div>

            {personalText && (
              <span className="font-sans text-[11px] font-medium text-muted-foreground">
                {personalText}
              </span>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {actor.is_participant && viewMode === "interactive" ? (
              <MousePointerClick className="size-3.5 shrink-0 text-primary" />
            ) : (
              <Info className="size-3.5 shrink-0" />
            )}
            <span>{getDefaultHintText(actor, viewMode)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
