"use client";

import type { BaselineItem, OverrideItem } from "@/types/kairos";
import { BlockOverrideItem } from "@/components/dashboard/BlockOverrideItem";
import { UnblockOverrideItem } from "@/components/dashboard/UnblockOverrideItem";

interface OverrideListProps {
  overrides: OverrideItem[];
  baseline: BaselineItem[];
  onDelete: (id: string) => void;
}

export function OverrideList({
  overrides,
  baseline,
  onDelete,
}: OverrideListProps) {
  if (overrides.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
        <p className="text-sm font-medium text-foreground">
          Belum ada jadwal periodik
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {overrides.map((ov) =>
        ov.type === "block" ? (
          <BlockOverrideItem
            key={ov.id}
            override={ov}
            onDelete={onDelete}
          />
        ) : (
          <UnblockOverrideItem
            key={ov.id}
            override={ov}
            baseline={baseline}
            onDelete={onDelete}
          />
        ),
      )}
    </div>
  );
}

