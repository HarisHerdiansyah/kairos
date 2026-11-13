"use client";

import { Trash2 } from "lucide-react";

import type { OverrideBlock } from "@/types/kairos";
import { formatDateRangeId } from "@/lib/format-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BlockOverrideItemProps {
  override: OverrideBlock;
  onDelete: (id: string) => void;
}

export function BlockOverrideItem({
  override,
  onDelete,
}: BlockOverrideItemProps) {
  const dateRangeText = formatDateRangeId(
    override.date_from,
    override.date_to,
  );

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="destructive" className="text-[11px]">
            Eventual Block
          </Badge>
          <span className="text-sm font-semibold text-foreground">
            {override.label}
          </span>
        </div>
        <span className="font-sans text-xs text-muted-foreground">
          {dateRangeText} • {override.start}–{override.end} WIB
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
