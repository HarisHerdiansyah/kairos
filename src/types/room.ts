import type {
  BestTimeRecommendation,
  LockedSlot,
  PersonalGridSlot,
  RoomCalculationResult,
  RoomInputSlot,
} from "@/types/kairos";

export const GUEST_TOKEN_PREFIX = "kairos_guest_token_";

export interface RoomParticipant {
  id: string;
  name: string;
  is_guest: boolean;
  is_owner: boolean;
  joined_at: string;
}

export interface RoomActor {
  is_owner: boolean;
  actor_type: "user" | "guest" | "anonymous";
  is_participant: boolean;
  participant_id: string | null;
  user_id: string | null;
}

export interface RoomInfo {
  id: string;
  title: string;
  date_from: string;
  date_to: string;
  time_from: string;
  time_to: string;
  duration_min: number;
  quorum: number;
  status: "open" | "confirmed";
  locked_slot: LockedSlot | null;
  owner: {
    id: string;
    name: string;
  };
  created_at: string;
}

export interface RoomDetailData {
  room: RoomInfo;
  actor: RoomActor;
  participants: RoomParticipant[];
  calculation: RoomCalculationResult | null;
  personal_grid: PersonalGridSlot[];
  personal_room_input: RoomInputSlot[];
}

export interface HighlightedWindow {
  date: string;
  start: string;
  end: string;
}

export interface DateColumnHeader {
  dateStr: string;
  dayName: string;
  dateLabel: string;
}

export interface GridCellCoord {
  colIdx: number;
  rowIdx: number;
}

export interface DragSelectionBounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

export interface TimefulCellViewModel {
  key: string;
  colIdx: number;
  rowIdx: number;
  dateStr: string;
  slotStart: string;
  slotEnd: string;
  canInteract: boolean;
  isInDragBox: boolean;
  isHighlighted: boolean;
  isBusyBlockStart: boolean;
  isOverrideBlockStart: boolean;
  personalLabel: string | null;
  topBorderClass: string;
  cellSurfaceClass: string;
}

export interface TimefulRowViewModel {
  slotStart: string;
  slotEnd: string;
  isFullHour: boolean;
  cells: TimefulCellViewModel[];
}

export interface TimefulGridCellProps {
  cell: TimefulCellViewModel;
  onMouseDown: (cell: TimefulCellViewModel) => void;
  onMouseEnter: (cell: TimefulCellViewModel) => void;
}

export interface RoomHeaderProps {
  room: RoomInfo;
  isOwner: boolean;
  onCopyLink: () => void;
}

export interface ConfirmedRoomViewProps {
  room: RoomInfo;
  participants: RoomParticipant[];
}

export interface AnonymousGateBannerProps {
  roomId: string;
  onJoined: () => Promise<void>;
}

export interface TimefulGridProps {
  room: RoomInfo;
  actor: RoomActor;
  participants: RoomParticipant[];
  calculation: RoomCalculationResult | null;
  personalGrid: PersonalGridSlot[];
  personalRoomInput: RoomInputSlot[];
  highlightedWindow: HighlightedWindow | null;
  resettingGrid: boolean;
  onSaveAvailabilityBatch: (updatedInput: RoomInputSlot[]) => Promise<void>;
  onResetToPersonalSchedule: () => Promise<void>;
}

export interface RecommendationCardProps {
  room: RoomInfo;
  actor: RoomActor;
  calculation: RoomCalculationResult | null;
  highlightedWindow: HighlightedWindow | null;
  onHoverWindow: (window: HighlightedWindow | null) => void;
  onSelectLock: (rec: BestTimeRecommendation) => void;
  onCopyLink: () => void;
}

export interface ParticipantListCardProps {
  participants: RoomParticipant[];
}

export interface LockScheduleDialogProps {
  open: boolean;
  room: RoomInfo;
  recommendation: BestTimeRecommendation | null;
  onOpenChange: (open: boolean) => void;
  onLocked: () => Promise<void>;
}

export interface RoomPageState {
  loading: boolean;
  notFoundError: string | null;
  data: RoomDetailData | null;
  resettingGrid: boolean;
  highlightedWindow: HighlightedWindow | null;
  lockDialogOpen: boolean;
  selectedRec: BestTimeRecommendation | null;
}

export type RoomPageAction =
  | { type: "FETCH_SUCCESS"; data: RoomDetailData }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_RESETTING_GRID"; resetting: boolean }
  | { type: "SET_HIGHLIGHTED_WINDOW"; window: HighlightedWindow | null }
  | { type: "OPEN_LOCK_DIALOG"; recommendation: BestTimeRecommendation }
  | { type: "SET_LOCK_DIALOG_OPEN"; open: boolean };

export interface RoomErrorAlertProps {
  message: string | null;
}

export interface OpenRoomViewProps {
  data: RoomDetailData;
  highlightedWindow: HighlightedWindow | null;
  resettingGrid: boolean;
  onJoined: () => Promise<void>;
  onSaveAvailabilityBatch: (updatedInput: RoomInputSlot[]) => Promise<void>;
  onResetToPersonalSchedule: () => Promise<void>;
  onHoverWindow: (window: HighlightedWindow | null) => void;
  onSelectLock: (rec: BestTimeRecommendation) => void;
  onCopyLink: () => void;
}
