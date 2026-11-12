import type * as React from "react";
import type { BaselineItem, OverrideItem, RoomSummary } from "@/types/kairos";

// -------------------------------------------------------------
// Dashboard Page Data State & Actions
// -------------------------------------------------------------
export interface DashboardDataState {
  loadingData: boolean;
  baseline: BaselineItem[];
  overrides: OverrideItem[];
  ownedRooms: RoomSummary[];
  joinedRooms: RoomSummary[];
}

export type DashboardDataAction =
  | {
      type: "SET_SCHEDULE";
      baseline: BaselineItem[];
      overrides: OverrideItem[];
    }
  | {
      type: "SET_ROOMS";
      ownedRooms: RoomSummary[];
      joinedRooms: RoomSummary[];
    }
  | { type: "SET_LOADING"; loading: boolean };

// -------------------------------------------------------------
// RoutineCard (Baseline F2) State, Actions, & Props
// -------------------------------------------------------------
export interface BaselineFormState {
  open: boolean;
  editingId: string | null;
  day: number;
  start: string;
  end: string;
  label: string;
  error: string | null;
  submitting: boolean;
}

export type BaselineFormAction =
  | { type: "OPEN_ADD"; defaultDay: number }
  | { type: "OPEN_EDIT"; item: BaselineItem }
  | { type: "SET_OPEN"; open: boolean }
  | {
      type: "SET_FIELD";
      field: "day" | "start" | "end" | "label";
      value: number | string;
    }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_SUBMITTING"; submitting: boolean };

export interface RoutineCardProps {
  baseline: BaselineItem[];
  onRefresh: () => Promise<void>;
}

// -------------------------------------------------------------
// OverrideCard (Eventual Block & Unblock F3) State, Actions, & Props
// -------------------------------------------------------------
export interface OverrideDialogState {
  activeModal: "none" | "block" | "unblock";
  blockDateFrom: string;
  blockDateTo: string;
  blockStart: string;
  blockEnd: string;
  blockLabel: string;
  blockError: string | null;
  blockSubmitting: boolean;
  unblockDateFrom: string;
  unblockDateTo: string;
  unblockBaselineId: string;
  unblockError: string | null;
  unblockSubmitting: boolean;
}

export type OverrideDialogAction =
  | { type: "OPEN_BLOCK"; today: string }
  | { type: "OPEN_UNBLOCK"; today: string }
  | { type: "CLOSE_MODAL" }
  | {
      type: "SET_BLOCK_FIELD";
      field:
        | "blockDateFrom"
        | "blockDateTo"
        | "blockStart"
        | "blockEnd"
        | "blockLabel";
      value: string;
    }
  | { type: "SET_BLOCK_DATE_FROM"; value: string }
  | { type: "SET_BLOCK_ERROR"; error: string | null }
  | { type: "SET_BLOCK_SUBMITTING"; submitting: boolean }
  | {
      type: "SET_UNBLOCK_FIELD";
      field: "unblockDateTo" | "unblockBaselineId";
      value: string;
    }
  | { type: "SET_UNBLOCK_DATE_FROM"; value: string }
  | { type: "SET_UNBLOCK_ERROR"; error: string | null }
  | { type: "SET_UNBLOCK_SUBMITTING"; submitting: boolean };

export interface OverrideCardProps {
  baseline: BaselineItem[];
  overrides: OverrideItem[];
  onRefresh: () => Promise<void>;
}

// -------------------------------------------------------------
// RoomCard (Room Management & History F4) State, Actions, & Props
// -------------------------------------------------------------
export interface RoomFormState {
  open: boolean;
  editingRoomId: string | null;
  title: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  duration: number;
  quorum: number;
  error: string | null;
  submitting: boolean;
}

export type RoomFormAction =
  | { type: "OPEN_CREATE"; dateFrom: string; dateTo: string }
  | { type: "OPEN_EDIT"; room: RoomSummary }
  | { type: "SET_OPEN"; open: boolean }
  | {
      type: "SET_FIELD";
      field: "title" | "dateTo" | "timeFrom" | "timeTo" | "duration" | "quorum";
      value: string | number;
    }
  | { type: "SET_DATE_FROM"; value: string }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_SUBMITTING"; submitting: boolean };

export interface RoomCardHandle {
  openCreateRoom: () => void;
}

export interface RoomCardProps {
  ownedRooms: RoomSummary[];
  joinedRooms: RoomSummary[];
  onRefresh: () => Promise<void>;
  ref?: React.Ref<RoomCardHandle>;
}

