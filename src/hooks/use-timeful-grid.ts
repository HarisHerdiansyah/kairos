import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { RoomInputSlot } from "@/types/kairos";
import type {
  GridCellCoord,
  TimefulCellViewModel,
  TimefulGridProps,
} from "@/types/room";
import {
  buildDateColumnHeaders,
  buildHeatmapMap,
  buildInputKeySet,
  buildPersonalMap,
  buildTimefulGridRows,
  computeDraggedRoomInput,
  computeDragSelectionBounds,
} from "@/lib/room-grid-utils";
import { generateDayHalfHourSlots } from "@/lib/scheduler-engine";
import { getDatesInRange } from "@/lib/time-utils";

export function useTimefulGrid({
  room,
  actor,
  participants,
  calculation,
  personalGrid,
  personalRoomInput,
  highlightedWindow,
  onSaveAvailabilityBatch,
}: Pick<
  TimefulGridProps,
  | "room"
  | "actor"
  | "participants"
  | "calculation"
  | "personalGrid"
  | "personalRoomInput"
  | "highlightedWindow"
  | "onSaveAvailabilityBatch"
>) {
  const [dragStart, setDragStart] = useState<GridCellCoord | null>(null);
  const [dragCurrent, setDragCurrent] = useState<GridCellCoord | null>(null);
  const [dragAction, setDragAction] = useState<"add" | "remove" | "auto">(
    "auto",
  );
  const [savingInput, setSavingInput] = useState<RoomInputSlot[] | null>(null);
  const [savingBatch, setSavingBatch] = useState(false);

  const dates = useMemo(
    () => getDatesInRange(room.date_from, room.date_to),
    [room.date_from, room.date_to],
  );
  const dateHeaders = useMemo(() => buildDateColumnHeaders(dates), [dates]);
  const daySlots = useMemo(
    () => generateDayHalfHourSlots(room.time_from, room.time_to),
    [room.time_from, room.time_to],
  );

  const heatmapMap = useMemo(
    () => buildHeatmapMap(calculation),
    [calculation],
  );
  const personalMap = useMemo(
    () => buildPersonalMap(personalGrid),
    [personalGrid],
  );
  const originalInputSet = useMemo(
    () => buildInputKeySet(personalRoomInput),
    [personalRoomInput],
  );

  const baseInput = savingInput ?? personalRoomInput;
  const baseInputSet = useMemo(() => buildInputKeySet(baseInput), [baseInput]);

  const dragBounds = useMemo(
    () => computeDragSelectionBounds(dragStart, dragCurrent),
    [dragStart, dragCurrent],
  );

  const dragComputation = useMemo(
    () =>
      computeDraggedRoomInput({
        baseInput,
        bounds: dragBounds,
        dragAction,
        dates,
        daySlots,
        roomStatus: room.status,
        actor,
        savingBatch,
        personalMap,
      }),
    [
      baseInput,
      dragBounds,
      dragAction,
      dates,
      daySlots,
      room.status,
      actor,
      savingBatch,
      personalMap,
    ],
  );

  const activeRoomInput = dragBounds ? dragComputation.nextInput : baseInput;
  const activeInputSet = useMemo(
    () => buildInputKeySet(activeRoomInput),
    [activeRoomInput],
  );

  const latestDragRef = useRef({
    isDragging: false,
    nextInput: baseInput,
    interactableCount: 0,
    didChange: false,
    actorType: actor.actor_type,
    onSaveAvailabilityBatch,
  });

  useEffect(() => {
    latestDragRef.current = {
      isDragging: dragStart !== null,
      nextInput: dragComputation.nextInput,
      interactableCount: dragComputation.interactableCount,
      didChange: dragComputation.didChange,
      actorType: actor.actor_type,
      onSaveAvailabilityBatch,
    };
  }, [
    dragStart,
    dragComputation,
    actor.actor_type,
    onSaveAvailabilityBatch,
  ]);

  const finishDrag = useCallback(async () => {
    const snapshot = latestDragRef.current;
    if (!snapshot.isDragging) return;

    latestDragRef.current.isDragging = false;
    setDragStart(null);
    setDragCurrent(null);

    if (snapshot.interactableCount === 0) {
      if (snapshot.actorType === "user") {
        toast.info(
          "Slot tersebut sudah berstatus Luang (Hadir) dari jadwal pribadi Anda. Seret pada blok Jadwal Sibuk jika ingin menandai 'Tetap Hadir'.",
        );
      }
      return;
    }

    if (!snapshot.didChange) {
      return;
    }

    setSavingInput(snapshot.nextInput);
    setSavingBatch(true);
    try {
      await snapshot.onSaveAvailabilityBatch(snapshot.nextInput);
    } finally {
      setSavingInput(null);
      setSavingBatch(false);
    }
  }, []);

  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (latestDragRef.current.isDragging) {
        void finishDrag();
      }
    };
    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("touchend", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("touchend", handleWindowMouseUp);
    };
  }, [finishDrag]);

  const handleCellMouseDown = useCallback(
    (cell: TimefulCellViewModel) => {
      if (room.status !== "open" || !actor.is_participant || savingBatch) {
        return;
      }

      const coord: GridCellCoord = {
        colIdx: cell.colIdx,
        rowIdx: cell.rowIdx,
      };

      let initialAction: "add" | "remove" | "auto" = "auto";
      if (cell.canInteract) {
        initialAction = baseInputSet.has(cell.key) ? "remove" : "add";
      }

      setDragAction(initialAction);
      setDragStart(coord);
      setDragCurrent(coord);
    },
    [room.status, actor.is_participant, savingBatch, baseInputSet],
  );

  const handleCellMouseEnter = useCallback((cell: TimefulCellViewModel) => {
    if (!latestDragRef.current.isDragging) return;
    setDragCurrent({ colIdx: cell.colIdx, rowIdx: cell.rowIdx });
  }, []);

  const rows = useMemo(
    () =>
      buildTimefulGridRows({
        dates,
        daySlots,
        roomStatus: room.status,
        actor,
        savingBatch,
        participantCount: participants.length,
        heatmapMap,
        personalMap,
        originalInputSet,
        activeInputSet,
        dragBounds,
        highlightedWindow,
      }),
    [
      dates,
      daySlots,
      room.status,
      actor,
      savingBatch,
      participants.length,
      heatmapMap,
      personalMap,
      originalInputSet,
      activeInputSet,
      dragBounds,
      highlightedWindow,
    ],
  );

  return {
    savingBatch,
    overrideCount: activeRoomInput.length,
    dateHeaders,
    rows,
    handleCellMouseDown,
    handleCellMouseEnter,
  };
}
