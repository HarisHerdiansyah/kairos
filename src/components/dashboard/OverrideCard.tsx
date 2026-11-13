"use client";

import { useReducer } from "react";
import { CalendarOff, CalendarPlus } from "lucide-react";
import { toast } from "sonner";

import type { OverrideCardProps } from "@/types/dashboard";
import {
  initialOverrideDialogState,
  overrideDialogReducer,
} from "@/lib/dashboard-reducers";
import { getTodayWibString } from "@/lib/format-ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OverrideDialog } from "@/components/dashboard/OverrideDialog";
import { OverrideList } from "@/components/dashboard/OverrideList";

export function OverrideCard({
  baseline,
  overrides,
  onRefresh,
}: OverrideCardProps) {
  const [state, dispatch] = useReducer(
    overrideDialogReducer,
    initialOverrideDialogState,
  );

  const openAddBlock = () => {
    dispatch({ type: "OPEN_BLOCK", today: getTodayWibString(0) });
  };

  const openAddUnblock = () => {
    dispatch({ type: "OPEN_UNBLOCK", today: getTodayWibString(0) });
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/schedule/overrides/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal menghapus jadwal insidental.");
        return;
      }
      toast.success("Jadwal insidental dihapus.");
      await onRefresh();
    } catch {
      toast.error("Gagal menghapus jadwal insidental.");
    }
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-start">
          <CardTitle className="font-serif text-xl">Jadwal Periodik</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={openAddUnblock}>
              <CalendarOff className="size-4" />
              <span>Liburkan Rutinitas</span>
            </Button>
            <Button size="sm" onClick={openAddBlock}>
              <CalendarPlus className="size-4" />
              <span>Tambah Jadwal</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <OverrideList
            overrides={overrides}
            baseline={baseline}
            onDelete={handleDeleteOverride}
          />
        </CardContent>
      </Card>

      <OverrideDialog
        state={state}
        baseline={baseline}
        dispatch={dispatch}
        onRefresh={onRefresh}
      />
    </>
  );
}
