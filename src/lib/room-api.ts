import type { RoomInputSlot } from "@/types/kairos";
import { GUEST_TOKEN_PREFIX, type RoomDetailData } from "@/types/room";

interface ApiResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
}

function getStoredGuestToken(roomId: string): string | null {
  if (typeof window === "undefined" || !roomId) return null;
  return window.localStorage.getItem(`${GUEST_TOKEN_PREFIX}${roomId}`);
}

function setStoredGuestToken(roomId: string, token: string): void {
  if (typeof window === "undefined" || !roomId) return;
  window.localStorage.setItem(`${GUEST_TOKEN_PREFIX}${roomId}`, token);
}

export async function fetchRoomDetailApi(
  roomId: string,
): Promise<ApiResult<RoomDetailData>> {
  try {
    const guestToken = getStoredGuestToken(roomId);
    const headers: Record<string, string> = {};
    if (guestToken) {
      headers["x-guest-token"] = guestToken;
    }

    const res = await fetch(`/api/v1/rooms/${roomId}`, {
      headers,
      cache: "no-store",
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        ok: false,
        error: json.error || "Ruang temu tidak ditemukan.",
      };
    }

    return { ok: true, data: json.data as RoomDetailData };
  } catch {
    return {
      ok: false,
      error: "Gagal memuat data ruang temu. Periksa koneksi Anda.",
    };
  }
}

export async function joinRoomAsUserApi(roomId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/v1/rooms/${roomId}/join`, {
      method: "POST",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function joinRoomAsGuestApi(
  roomId: string,
  guestName: string,
): Promise<ApiResult<{ guest_token?: string }>> {
  try {
    const res = await fetch(`/api/v1/rooms/${roomId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_name: guestName.trim() }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        ok: false,
        error: json.error || "Gagal bergabung sebagai Guest.",
      };
    }

    if (json.data?.guest_token) {
      setStoredGuestToken(roomId, json.data.guest_token);
    }

    return { ok: true, data: json.data };
  } catch {
    return {
      ok: false,
      error: "Terjadi kesalahan jaringan saat bergabung.",
    };
  }
}

export async function saveRoomAvailabilityApi(
  roomId: string,
  roomInput: RoomInputSlot[],
): Promise<ApiResult> {
  try {
    const guestToken = getStoredGuestToken(roomId);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (guestToken) {
      headers["x-guest-token"] = guestToken;
    }

    const res = await fetch(`/api/v1/rooms/${roomId}/availability`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ room_input: roomInput }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        ok: false,
        error: json.error || "Gagal menyimpan perubahan ketersediaan.",
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal memperbarui slot waktu." };
  }
}

export async function lockRoomScheduleApi(
  roomId: string,
  payload: { date: string; start: string; end: string },
): Promise<ApiResult> {
  try {
    const res = await fetch(`/api/v1/rooms/${roomId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        ok: false,
        error: json.error || "Gagal mengunci jadwal.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Terjadi kesalahan saat mengunci jadwal." };
  }
}

