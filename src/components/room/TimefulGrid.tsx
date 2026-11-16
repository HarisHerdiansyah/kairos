"use client";

import type { TimefulGridProps } from "@/types/room";
import { useTimefulGrid } from "@/hooks/use-timeful-grid";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TimefulGridCell } from "@/components/room/TimefulGridCell";

export function TimefulGrid({
  room,
  actor,
  participants,
  calculation,
  personalGrid,
  personalRoomInput,
  highlightedWindow,
  onSaveAvailabilityBatch,
}: TimefulGridProps) {
  const { dateHeaders, rows, handleCellMouseDown, handleCellMouseEnter } =
    useTimefulGrid({
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
      <CardContent>
        <div className="overflow-x-auto rounded-2xl border border-border bg-background select-none">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="sticky left-0 z-20 w-18 border-r border-border bg-muted/90 px-2.5 py-2.5 text-right font-sans text-[11px] font-medium text-muted-foreground">
                  WIB
                </th>
                {dateHeaders.map(({ dateStr, dayName, dateLabel }) => (
                  <th
                    key={dateStr}
                    className="min-w-28 border-border px-2 py-2.5 text-center last:border-r-0"
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
