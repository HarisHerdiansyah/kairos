"use client";

import type { OverrideDialogProps } from "@/types/dashboard";
import { BlockDialog } from "@/components/dashboard/BlockDialog";
import { UnblockDialog } from "@/components/dashboard/UnblockDialog";

export function OverrideDialog({
  state,
  baseline,
  dispatch,
  onRefresh,
}: OverrideDialogProps) {
  return (
    <>
      <BlockDialog state={state} dispatch={dispatch} onRefresh={onRefresh} />
      <UnblockDialog
        state={state}
        baseline={baseline}
        dispatch={dispatch}
        onRefresh={onRefresh}
      />
    </>
  );
}

export { BlockDialog, UnblockDialog };

