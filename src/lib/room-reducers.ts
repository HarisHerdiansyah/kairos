import type { RoomPageAction, RoomPageState } from "@/types/room";

export const initialRoomPageState: RoomPageState = {
  loading: true,
  notFoundError: null,
  data: null,
  resettingGrid: false,
  highlightedWindow: null,
  lockDialogOpen: false,
  selectedRec: null,
};

export function roomPageReducer(
  state: RoomPageState,
  action: RoomPageAction,
): RoomPageState {
  switch (action.type) {
    case "FETCH_SUCCESS":
      return {
        ...state,
        loading: false,
        notFoundError: null,
        data: action.data,
      };
    case "FETCH_ERROR":
      return {
        ...state,
        loading: false,
        notFoundError: action.error,
      };
    case "SET_LOADING":
      return {
        ...state,
        loading: action.loading,
      };
    case "SET_RESETTING_GRID":
      return {
        ...state,
        resettingGrid: action.resetting,
      };
    case "SET_HIGHLIGHTED_WINDOW":
      return {
        ...state,
        highlightedWindow: action.window,
      };
    case "OPEN_LOCK_DIALOG":
      return {
        ...state,
        selectedRec: action.recommendation,
        lockDialogOpen: true,
      };
    case "SET_LOCK_DIALOG_OPEN":
      return {
        ...state,
        lockDialogOpen: action.open,
      };
    default:
      return state;
  }
}

