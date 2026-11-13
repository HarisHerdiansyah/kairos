"use client";

import { RotateCcw } from "lucide-react";

import type { TimefulGridProps } from "@/types/room";
import { useTimefulGrid } from "@/hooks/use-timeful-grid";
import { getHeaderDescription } from "@/lib/room-grid-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GridInspectorBar } from "@/components/room/GridInspectorBar";
import { TimefulGridCell } from "@/components/room/TimefulGridCell";

export function TimefulGrid({
  room,
  actor,
  participants,
  calculation,
  personalGrid,
  personalRoomInput,
  highlightedWindow,
  resettingGrid,
  onSaveAvailabilityBatch,
  onResetToPersonalSchedule,
}: TimefulGridProps) {
  const {
    viewMode,
    setViewMode,
    hoveredSlot,
    setHoveredSlot,
    savingBatch,
    overrideCount,
    dateHeaders,
    rows,
    handleCellMouseDown,
    handleCellMouseEnter,
  } = useTimefulGrid({
    room,
    actor,
    participants,
    calculation,
    personalGrid,
    personalRoomInput,
    highlightedWindow,
    onSaveAvailabilityBatch,
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div>
          <CardTitle className="font-serif text-lg">
            Peta Ketersediaan Waktu (Heatmap)
          </CardTitle>
          <CardDescription className="mt-0.5 text-xs">
            {getHeaderDescription(actor)}
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actor.actor_type === "user" &&
            actor.is_participant &&
            overrideCount > 0 && (
              <Button
                variant="outline"
                size="xs"
                onClick={onResetToPersonalSchedule}
                disabled={resettingGrid || savingBatch}
              >
                <RotateCcw className="size-3.5" />
                <span>
                  {resettingGrid ? "Mereset..." : "Reset ke jadwal pribadi"}
                </span>
              </Button>
            )}

          {actor.is_participant && (
            <div className="inline-flex rounded-full bg-muted p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("interactive")}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition-colors",
                  viewMode === "interactive"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Edit & Heatmap
              </button>
              <button
                type="button"
                onClick={() => setViewMode("heatmap_only")}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition-colors",
                  viewMode === "heatmap_only"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Murni Heatmap
              </button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <GridInspectorBar
          hoveredSlot={hoveredSlot}
          actor={actor}
          viewMode={viewMode}
          quorum={room.quorum}
          totalParticipants={participants.length}
          overrideCount={overrideCount}
          savingBatch={savingBatch}
        />

        <div
          className="overflow-x-auto rounded-2xl border border-border bg-background select-none"
          onMouseLeave={() => setHoveredSlot(null)}
        >
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="sticky left-0 z-20 w-18 border-r border-border bg-muted/90 px-2.5 py-2.5 text-right font-sans text-[11px] font-medium text-muted-foreground">
                  WIB
                </th>
                {dateHeaders.map(({ dateStr, dayName, dateLabel }) => (
                  <th
                    key={dateStr}
                    className="min-w-28 border-r border-border px-2 py-2.5 text-center last:border-r-0"
                  >
                    <div className="font-sans text-[11px] font-medium text-muted-foreground">
                      {dateLabel}
                    </div>
                    <div className="font-serif text-sm font-semibold text-foreground">
                      {dayName}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.slotStart} className="h-7">
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-r border-border bg-card px-2.5 py-0 text-right align-top font-sans text-[11px] whitespace-nowrap",
                      row.isFullHour
                        ? "border-t border-t-border font-semibold text-foreground"
                        : "border-t border-dashed border-t-border/40 text-transparent",
                    )}
                  >
                    <span className="-mt-0.5 inline-block">
                      {row.slotStart}
                    </span>
                  </td>

                  {row.cells.map((cell) => (
                    <TimefulGridCell
                      key={cell.key}
                      cell={cell}
                      onMouseDown={handleCellMouseDown}
                      onMouseEnter={handleCellMouseEnter}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
