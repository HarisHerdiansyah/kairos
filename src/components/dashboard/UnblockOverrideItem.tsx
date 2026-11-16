"use client";

import { Trash2 } from "lucide-react";

import type { BaselineItem, OverrideUnblock } from "@/types/kairos";
import { DAY_NAMES, formatDateRangeId } from "@/lib/format-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface UnblockOverrideItemProps {
  override: OverrideUnblock;
  baseline: BaselineItem[];
  onDelete: (id: string) => void;
}

function getUnblockTitle(
  override: OverrideUnblock,
  baseline: BaselineItem[],
): string {
  if (override.baseline_id === null) {
    return "Libur Seluruh Jadwal Rutin";
  }

  const targetBase = baseline.find((b) => b.id === override.baseline_id);
  if (targetBase) {
    return `Libur: ${targetBase.label} (${DAY_NAMES[targetBase.day]} ${targetBase.start}–${targetBase.end})`;
  }

  return "Libur Jadwal Rutin";
}

export function UnblockOverrideItem({
  override,
  baseline,
  onDelete,
}: UnblockOverrideItemProps) {
  const dateRangeText = formatDateRangeId(
    override.date_from,
    override.date_to,
  );
  const title = getUnblockTitle(override, baseline);

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[11px]">
            Eventual Unblock
          </Badge>
          <span className="text-sm font-semibold text-foreground">
            {title}
          </span>
        </div>
        <span className="font-sans text-xs text-muted-foreground">
          {dateRangeText}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onDelete(override.id)}
        title="Hapus override"
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
