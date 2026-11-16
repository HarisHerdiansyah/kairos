import type {
  BestTimeRecommendation,
  HeatmapSlot,
  PersonalGridSlot,
  RoomCalculationResult,
  RoomInputSlot,
} from "@/types/kairos";
import type {
  DateColumnHeader,
  DragSelectionBounds,
  GridCellCoord,
  HighlightedWindow,
  RoomActor,
  RoomInfo,
  RoomParticipant,
  TimefulCellViewModel,
  TimefulRowViewModel,
} from "@/types/room";
import { formatShortDateHeader } from "@/lib/format-ui";

function getHeatmapToneClass(
  availableCount: number,
  totalParticipants: number,
): string {
  if (totalParticipants <= 0 || availableCount <= 0) {
    return "bg-background";
  }
  const ratio = availableCount / totalParticipants;
  if (ratio <= 0.25) {
    return "bg-chart-1/15";
  }
  if (ratio <= 0.5) {
    return "bg-chart-1/35";
  }
  if (ratio <= 0.75) {
    return "bg-chart-1/60";
  }
  if (ratio < 1) {
    return "bg-chart-1/80";
  }
  return "bg-chart-1";
}

function isSlotInHighlightedWindow(
  dateStr: string,
  slotStart: string,
  slotEnd: string,
  window: HighlightedWindow | null,
): boolean {
  if (!window || window.date !== dateStr) {
    return false;
  }
  return slotStart >= window.start && slotEnd <= window.end;
}

export function isWindowMatching(
  rec: BestTimeRecommendation,
  highlighted: HighlightedWindow | null,
): boolean {
  if (!highlighted) return false;
  return (
    highlighted.date === rec.date &&
    highlighted.start === rec.start &&
    highlighted.end === rec.end
  );
}

export function getParticipantRoleSuffix(participant: RoomParticipant): string {
  if (participant.is_owner) {
    return " (Inisiator)";
  }
  if (participant.is_guest) {
    return " (Guest)";
  }
  return "";
}

export function buildHeatmapMap(
  calculation: RoomCalculationResult | null,
): Map<string, HeatmapSlot> {
  const map = new Map<string, HeatmapSlot>();
  if (!calculation?.heatmap) return map;
  for (const h of calculation.heatmap) {
    map.set(`${h.date}_${h.start}`, h);
  }
  return map;
}

export function buildPersonalMap(
  personalGrid: PersonalGridSlot[],
): Map<string, PersonalGridSlot> {
  const map = new Map<string, PersonalGridSlot>();
  for (const p of personalGrid) {
    map.set(`${p.date}_${p.start}`, p);
  }
  return map;
}

export function buildInputKeySet(roomInput: RoomInputSlot[]): Set<string> {
  const set = new Set<string>();
  for (const item of roomInput) {
    set.add(`${item.date}_${item.start}`);
  }
  return set;
}

export function buildDateColumnHeaders(dates: string[]): DateColumnHeader[] {
  return dates.map((dateStr) => {
    const { dayName, dateLabel } = formatShortDateHeader(dateStr);
    return { dateStr, dayName, dateLabel };
  });
}

function getEffectivePersonalStatus(
  dateStr: string,
  slotStart: string,
  actor: RoomActor,
  activeInputSet: Set<string>,
  personalMap: Map<string, PersonalGridSlot>,
): {
  status: "free" | "busy" | "overridden_free" | null;
  label: string | null;
} {
  if (!actor.is_participant) {
    return { status: null, label: null };
  }
  const key = `${dateStr}_${slotStart}`;
  const isSelectedInRoom = activeInputSet.has(key);

  if (actor.actor_type === "guest") {
    return {
      status: isSelectedInRoom ? "free" : "busy",
      label: null,
    };
  }

  const pSlot = personalMap.get(key);
  if (!pSlot || pSlot.status === "free") {
    return { status: "free", label: null };
  }

  return {
    status: isSelectedInRoom ? "overridden_free" : "busy",
    label: pSlot.label,
  };
}

function canSlotInteract(
  dateStr: string,
  slotStart: string,
  roomStatus: RoomInfo["status"],
  actor: RoomActor,
  savingBatch: boolean,
  personalMap: Map<string, PersonalGridSlot>,
): boolean {
  if (roomStatus !== "open" || !actor.is_participant || savingBatch) {
    return false;
  }
  if (actor.actor_type === "guest") {
    return true;
  }
  const pSlot = personalMap.get(`${dateStr}_${slotStart}`);
  return Boolean(pSlot && pSlot.status !== "free");
}

export function computeDragSelectionBounds(
  start: GridCellCoord | null,
  current: GridCellCoord | null,
): DragSelectionBounds | null {
  if (!start || !current) return null;
  return {
    minCol: Math.min(start.colIdx, current.colIdx),
    maxCol: Math.max(start.colIdx, current.colIdx),
    minRow: Math.min(start.rowIdx, current.rowIdx),
    maxRow: Math.max(start.rowIdx, current.rowIdx),
  };
}

function isCellInDragBounds(
  colIdx: number,
  rowIdx: number,
  bounds: DragSelectionBounds | null,
): boolean {
  if (!bounds) return false;
  return (
    colIdx >= bounds.minCol &&
    colIdx <= bounds.maxCol &&
    rowIdx >= bounds.minRow &&
    rowIdx <= bounds.maxRow
  );
}

interface ComputeDraggedRoomInputParams {
  baseInput: RoomInputSlot[];
  bounds: DragSelectionBounds | null;
  dragAction: "add" | "remove" | "auto";
  dates: string[];
  daySlots: Array<{ start: string; end: string }>;
  roomStatus: RoomInfo["status"];
  actor: RoomActor;
  savingBatch: boolean;
  personalMap: Map<string, PersonalGridSlot>;
}

export function computeDraggedRoomInput({
  baseInput,
  bounds,
  dragAction,
  dates,
  daySlots,
  roomStatus,
  actor,
  savingBatch,
  personalMap,
}: ComputeDraggedRoomInputParams): {
  nextInput: RoomInputSlot[];
  interactableCount: number;
  didChange: boolean;
} {
  if (!bounds) {
    return {
      nextInput: baseInput,
      interactableCount: 0,
      didChange: false,
    };
  }

  const baseKeySet = buildInputKeySet(baseInput);
  const targetSlots: RoomInputSlot[] = [];

  for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
    const dateStr = dates[c];
    if (!dateStr) continue;
    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      const slot = daySlots[r];
      if (!slot) continue;
      if (
        canSlotInteract(
          dateStr,
          slot.start,
          roomStatus,
          actor,
          savingBatch,
          personalMap,
        )
      ) {
        targetSlots.push({
          date: dateStr,
          start: slot.start,
          end: slot.end,
        });
      }
    }
  }

  if (targetSlots.length === 0) {
    return {
      nextInput: baseInput,
      interactableCount: 0,
      didChange: false,
    };
  }

  let resolvedAction: "add" | "remove" =
    dragAction === "auto" ? "add" : dragAction;
  if (dragAction === "auto") {
    const firstKey = `${targetSlots[0].date}_${targetSlots[0].start}`;
    resolvedAction = baseKeySet.has(firstKey) ? "remove" : "add";
  }

  const targetKeySet = new Set(
    targetSlots.map((s) => `${s.date}_${s.start}`),
  );

  if (resolvedAction === "add") {
    const additions = targetSlots.filter(
      (s) => !baseKeySet.has(`${s.date}_${s.start}`),
    );
    if (additions.length === 0) {
      return {
        nextInput: baseInput,
        interactableCount: targetSlots.length,
        didChange: false,
      };
    }
    return {
      nextInput: [...baseInput, ...additions],
      interactableCount: targetSlots.length,
      didChange: true,
    };
  }

  const filtered = baseInput.filter(
    (item) => !targetKeySet.has(`${item.date}_${item.start}`),
  );
  return {
    nextInput: filtered,
    interactableCount: targetSlots.length,
    didChange: filtered.length !== baseInput.length,
  };
}

interface BuildGridMatrixParams {
  dates: string[];
  daySlots: Array<{ start: string; end: string }>;
  roomStatus: RoomInfo["status"];
  actor: RoomActor;
  savingBatch: boolean;
  participantCount: number;
  heatmapMap: Map<string, HeatmapSlot>;
  personalMap: Map<string, PersonalGridSlot>;
  originalInputSet: Set<string>;
  activeInputSet: Set<string>;
  dragBounds: DragSelectionBounds | null;
  highlightedWindow: HighlightedWindow | null;
}

export function buildTimefulGridRows({
  dates,
  daySlots,
  roomStatus,
  actor,
  savingBatch,
  participantCount,
  heatmapMap,
  personalMap,
  originalInputSet,
  activeInputSet,
  dragBounds,
  highlightedWindow,
}: BuildGridMatrixParams): TimefulRowViewModel[] {
  return daySlots.map((slot, rowIdx) => {
    const isFullHour = slot.start.endsWith(":00");
    const prevSlot = rowIdx > 0 ? daySlots[rowIdx - 1] : null;

    const cells: TimefulCellViewModel[] = dates.map((dateStr, colIdx) => {
      const key = `${dateStr}_${slot.start}`;
      const hSlot = heatmapMap.get(key);
      const totalP = hSlot?.total_participants ?? participantCount;

      const wasSelected = originalInputSet.has(key);
      const isSelected = activeInputSet.has(key);
      let deltaAvailable = 0;
      if (actor.is_participant) {
        if (isSelected && !wasSelected) deltaAvailable = 1;
        if (!isSelected && wasSelected) deltaAvailable = -1;
      }

      const rawAvailable = hSlot?.available_count ?? 0;
      const availableCount = Math.max(
        0,
        Math.min(totalP, rawAvailable + deltaAvailable),
      );

      const { status: personalStatus, label: personalLabel } =
        getEffectivePersonalStatus(
          dateStr,
          slot.start,
          actor,
          activeInputSet,
          personalMap,
        );
      const prevPersonal = prevSlot
        ? getEffectivePersonalStatus(
            dateStr,
            prevSlot.start,
            actor,
            activeInputSet,
            personalMap,
          )
        : { status: null, label: null };

      const canInteract = canSlotInteract(
        dateStr,
        slot.start,
        roomStatus,
        actor,
        savingBatch,
        personalMap,
      );

      const isUserBusyBlock =
        actor.is_participant &&
        actor.actor_type === "user" &&
        personalStatus === "busy";
      const isUserOverrideBlock =
        actor.is_participant &&
        actor.actor_type === "user" &&
        personalStatus === "overridden_free";

      const isSameBusyAsPrev =
        isUserBusyBlock &&
        prevPersonal.status === "busy" &&
        prevPersonal.label === personalLabel;
      const isSameOverrideAsPrev =
        isUserOverrideBlock &&
        prevPersonal.status === "overridden_free" &&
        prevPersonal.label === personalLabel;

      const isBlockContinuation = isSameBusyAsPrev || isSameOverrideAsPrev;
      const isBusyBlockStart = isUserBusyBlock && !isSameBusyAsPrev;
      const isOverrideBlockStart = isUserOverrideBlock && !isSameOverrideAsPrev;

      const isInDragBox = isCellInDragBounds(colIdx, rowIdx, dragBounds);

      const isHighlighted = isSlotInHighlightedWindow(
        dateStr,
        slot.start,
        slot.end,
        highlightedWindow,
      );

      const heatmapBgClass = getHeatmapToneClass(availableCount, totalP);

      let cellSurfaceClass = heatmapBgClass;
      if (isUserBusyBlock) {
        cellSurfaceClass =
          "border-l-3 border-l-destructive bg-secondary/90 text-secondary-foreground";
      } else if (isUserOverrideBlock) {
        cellSurfaceClass =
          "border-l-3 border-l-primary bg-chart-1/85 text-foreground";
      }

      let topBorderClass = "border-t border-dashed border-t-border/50";
      if (isBlockContinuation) {
        topBorderClass = "border-t-0";
      } else if (isFullHour) {
        topBorderClass = "border-t border-t-border";
      }

      return {
        key,
        colIdx,
        rowIdx,
        dateStr,
        slotStart: slot.start,
        slotEnd: slot.end,
        canInteract,
        isInDragBox,
        isHighlighted,
        isBusyBlockStart,
        isOverrideBlockStart,
        personalLabel,
        topBorderClass,
        cellSurfaceClass,
      };
    });

    return {
      slotStart: slot.start,
      slotEnd: slot.end,
      isFullHour,
      cells,
    };
  });
}
