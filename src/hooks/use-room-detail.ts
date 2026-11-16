import { useCallback, useEffect, useReducer, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import type { BestTimeRecommendation, RoomInputSlot } from "@/types/kairos";
import type { HighlightedWindow } from "@/types/room";
import {
  fetchRoomDetailApi,
  joinRoomAsUserApi,
  saveRoomAvailabilityApi,
} from "@/lib/room-api";
import { initialRoomPageState, roomPageReducer } from "@/lib/room-reducers";

export function useRoomDetail() {
  const params = useParams<{ id: string }>();
  const roomId = params?.id || "";
  const { status: authStatus } = useSession();

  const [state, dispatch] = useReducer(roomPageReducer, initialRoomPageState);
  const autoJoinedRef = useRef(false);

  const fetchRoomDetail = useCallback(
    async (silent = false) => {
      if (!roomId) return;
      if (!silent) {
        dispatch({ type: "SET_LOADING", loading: true });
      }

      const result = await fetchRoomDetailApi(roomId);
      if (!result.ok || !result.data) {
        dispatch({
          type: "FETCH_ERROR",
          error: result.error || "Ruang temu tidak ditemukan.",
        });
        return;
      }

      dispatch({ type: "FETCH_SUCCESS", data: result.data });
    },
    [roomId],
  );

  // Initial fetch once auth session status is resolved
  useEffect(() => {
    if (authStatus === "loading" || !roomId) return;
    let active = true;

    fetchRoomDetailApi(roomId).then((result) => {
      if (!active) return;
      if (!result.ok || !result.data) {
        dispatch({
          type: "FETCH_ERROR",
          error: result.error || "Ruang temu tidak ditemukan.",
        });
        return;
      }
      dispatch({ type: "FETCH_SUCCESS", data: result.data });
    });

    return () => {
      active = false;
    };
  }, [authStatus, roomId]);

  // F5: Automatically join room if visitor is a logged-in registered user and room is open
  useEffect(() => {
    const { data } = state;
    if (
      data &&
      data.room.status === "open" &&
      data.actor.actor_type === "user" &&
      !data.actor.is_participant &&
      !autoJoinedRef.current
    ) {
      autoJoinedRef.current = true;
      joinRoomAsUserApi(roomId).then((joined) => {
        if (joined) {
          void fetchRoomDetail(true);
        } else {
          autoJoinedRef.current = false;
        }
      });
    }
  }, [state, roomId, fetchRoomDetail]);

  const copyRoomLink = useCallback(() => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success("Tautan publik ruang temu disalin.");
  }, [roomId]);

  const saveAvailabilityBatch = useCallback(
    async (updatedList: RoomInputSlot[]) => {
      const { data } = state;
      if (!data || data.room.status !== "open" || !data.actor.is_participant) {
        return;
      }

      const result = await saveRoomAvailabilityApi(roomId, updatedList);
      if (!result.ok) {
        toast.error(result.error || "Gagal menyimpan perubahan ketersediaan.");
        return;
      }

      await fetchRoomDetail(true);
    },
    [state, roomId, fetchRoomDetail],
  );

  const setHighlightedWindow = useCallback(
    (window: HighlightedWindow | null) => {
      dispatch({ type: "SET_HIGHLIGHTED_WINDOW", window });
    },
    [],
  );

  const openLockModal = useCallback((recommendation: BestTimeRecommendation) => {
    dispatch({ type: "OPEN_LOCK_DIALOG", recommendation });
  }, []);

  const setLockDialogOpen = useCallback((open: boolean) => {
    dispatch({ type: "SET_LOCK_DIALOG_OPEN", open });
  }, []);

  return {
    state,
    fetchRoomDetail,
    copyRoomLink,
    saveAvailabilityBatch,
    setHighlightedWindow,
    openLockModal,
    setLockDialogOpen,
  };
}

