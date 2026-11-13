"use client";

import { Check } from "lucide-react";

import type { TimefulGridCellProps } from "@/types/room";
import { cn } from "@/lib/utils";

export function TimefulGridCell({
  cell,
  onMouseDown,
  onMouseEnter,
}: TimefulGridCellProps) {
  return (
    <td
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        onMouseDown(cell);
      }}
      onMouseEnter={() => onMouseEnter(cell)}
      className={cn(
        "relative h-7 border-r border-border p-0 align-top transition-colors select-none last:border-r-0",
        cell.topBorderClass,
        cell.cellSurfaceClass,
        cell.canInteract
          ? "cursor-pointer hover:brightness-95"
          : "cursor-crosshair",
        cell.isInDragBox && "z-10 ring-1 ring-primary ring-inset",
        cell.isHighlighted && "z-20 ring-2 ring-foreground ring-inset",
      )}
    >
      {cell.isBusyBlockStart && (
        <div className="pointer-events-none truncate px-1.5 pt-0.5 font-sans text-[10px] leading-tight font-medium select-none">
          {cell.personalLabel || "Sibuk"}
        </div>
      )}

      {cell.isOverrideBlockStart && (
        <div className="pointer-events-none flex items-center gap-1 truncate px-1.5 pt-0.5 font-sans text-[10px] leading-tight font-semibold select-none">
          <Check className="size-3 shrink-0" />
          <span className="truncate">
            Hadir ({cell.personalLabel || "Sibuk"})
          </span>
        </div>
      )}
    </td>
  );
}
