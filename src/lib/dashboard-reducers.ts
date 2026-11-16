import type {
  BaselineFormAction,
  BaselineFormState,
  DashboardDataAction,
  DashboardDataState,
  OverrideDialogAction,
  OverrideDialogState,
  RoomFormAction,
  RoomFormState,
} from "@/types/dashboard";

// -------------------------------------------------------------
// Dashboard Page Data Reducer
// -------------------------------------------------------------
export const initialDashboardDataState: DashboardDataState = {
  loadingData: true,
  baseline: [],
  overrides: [],
  ownedRooms: [],
  joinedRooms: [],
};

export function dashboardDataReducer(
  state: DashboardDataState,
  action: DashboardDataAction,
): DashboardDataState {
  switch (action.type) {
    case "SET_SCHEDULE":
      return {
        ...state,
        baseline: action.baseline,
        overrides: action.overrides,
      };
    case "SET_ROOMS":
      return {
        ...state,
        ownedRooms: action.ownedRooms,
        joinedRooms: action.joinedRooms,
      };
    case "SET_LOADING":
      return {
        ...state,
        loadingData: action.loading,
      };
    default:
      return state;
  }
}

// -------------------------------------------------------------
// RoutineCard (Baseline F2) Reducer
// -------------------------------------------------------------
export const initialBaselineFormState: BaselineFormState = {
  open: false,
  editingId: null,
  day: 1,
  start: "08:00",
  end: "10:00",
  label: "",
  error: null,
  submitting: false,
};

export function baselineFormReducer(
  state: BaselineFormState,
  action: BaselineFormAction,
): BaselineFormState {
  switch (action.type) {
    case "OPEN_ADD":
      return {
        ...initialBaselineFormState,
        open: true,
        day: action.defaultDay,
      };
    case "OPEN_EDIT":
      return {
        open: true,
        editingId: action.item.id,
        day: action.item.day,
        start: action.item.start,
        end: action.item.end,
        label: action.item.label,
        error: null,
        submitting: false,
      };
    case "SET_OPEN":
      return { ...state, open: action.open };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value, error: null };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_SUBMITTING":
      return { ...state, submitting: action.submitting };
    default:
      return state;
  }
}

// -------------------------------------------------------------
// OverrideCard (Eventual Block & Unblock F3) Reducer
// -------------------------------------------------------------
export const initialOverrideDialogState: OverrideDialogState = {
  activeModal: "none",
  blockDateFrom: "",
  blockDateTo: "",
  blockStart: "13:00",
  blockEnd: "15:00",
  blockLabel: "",
  blockError: null,
  blockSubmitting: false,
  unblockDateFrom: "",
  unblockDateTo: "",
  unblockBaselineId: "ALL",
  unblockError: null,
  unblockSubmitting: false,
};

export function overrideDialogReducer(
  state: OverrideDialogState,
  action: OverrideDialogAction,
): OverrideDialogState {
  switch (action.type) {
    case "OPEN_BLOCK":
      return {
        ...state,
        activeModal: "block",
        blockDateFrom: action.today,
        blockDateTo: action.today,
        blockStart: "13:00",
        blockEnd: "15:00",
        blockLabel: "",
        blockError: null,
        blockSubmitting: false,
      };
    case "OPEN_UNBLOCK":
      return {
        ...state,
        activeModal: "unblock",
        unblockDateFrom: action.today,
        unblockDateTo: action.today,
        unblockBaselineId: "ALL",
        unblockError: null,
        unblockSubmitting: false,
      };
    case "CLOSE_MODAL":
      return { ...state, activeModal: "none" };
    case "SET_BLOCK_DATE_FROM":
      return {
        ...state,
        blockDateFrom: action.value,
        blockDateTo:
          state.blockDateTo < action.value ? action.value : state.blockDateTo,
        blockError: null,
      };
    case "SET_BLOCK_FIELD":
      return { ...state, [action.field]: action.value, blockError: null };
    case "SET_BLOCK_ERROR":
      return { ...state, blockError: action.error };
    case "SET_BLOCK_SUBMITTING":
      return { ...state, blockSubmitting: action.submitting };
    case "SET_UNBLOCK_DATE_FROM":
      return {
        ...state,
        unblockDateFrom: action.value,
        unblockDateTo:
          state.unblockDateTo < action.value
            ? action.value
            : state.unblockDateTo,
        unblockError: null,
      };
    case "SET_UNBLOCK_FIELD":
      return { ...state, [action.field]: action.value, unblockError: null };
    case "SET_UNBLOCK_ERROR":
      return { ...state, unblockError: action.error };
    case "SET_UNBLOCK_SUBMITTING":
      return { ...state, unblockSubmitting: action.submitting };
    default:
      return state;
  }
}

// -------------------------------------------------------------
// RoomCard (Room Management & History F4) Reducer
// -------------------------------------------------------------
export const initialRoomFormState: RoomFormState = {
  open: false,
  editingRoomId: null,
  title: "",
  dateFrom: "",
  dateTo: "",
  timeFrom: "08:00",
  timeTo: "17:00",
  duration: 60,
  quorum: 2,
  error: null,
  submitting: false,
};

export function roomFormReducer(
  state: RoomFormState,
  action: RoomFormAction,
): RoomFormState {
  switch (action.type) {
    case "OPEN_CREATE":
      return {
        ...initialRoomFormState,
        open: true,
        dateFrom: action.dateFrom,
        dateTo: action.dateTo,
      };
    case "OPEN_EDIT":
      return {
        open: true,
        editingRoomId: action.room.id,
        title: action.room.title,
        dateFrom: action.room.date_from,
        dateTo: action.room.date_to,
        timeFrom: action.room.time_from,
        timeTo: action.room.time_to,
        duration: action.room.duration_min,
        quorum: action.room.quorum,
        error: null,
        submitting: false,
      };
    case "SET_OPEN":
      return { ...state, open: action.open };
    case "SET_DATE_FROM":
      return {
        ...state,
        dateFrom: action.value,
        dateTo: state.dateTo < action.value ? action.value : state.dateTo,
        error: null,
      };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value, error: null };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_SUBMITTING":
      return { ...state, submitting: action.submitting };
    default:
      return state;
  }
}

