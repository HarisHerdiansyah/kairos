"use client";

import { useCallback, useImperativeHandle, useReducer } from "react";
import { toast } from "sonner";

import type { RoomSummary } from "@/types/kairos";
import type { RoomCardProps } from "@/types/dashboard";
import {
  initialRoomFormState,
  roomFormReducer,
} from "@/lib/dashboard-reducers";
import { getTodayWibString } from "@/lib/format-ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JoinedRoomsTab } from "@/components/dashboard/JoinedRoomsTab";
import { OwnedRoomsTab } from "@/components/dashboard/OwnedRoomsTab";
import { RoomDialog } from "@/components/dashboard/RoomDialog";

export function RoomCard({
  ownedRooms,
  joinedRooms,
  onRefresh,
  ref,
}: RoomCardProps) {
  const [form, dispatch] = useReducer(roomFormReducer, initialRoomFormState);

  const openCreateRoom = useCallback(() => {
    dispatch({
      type: "OPEN_CREATE",
      dateFrom: getTodayWibString(0),
      dateTo: getTodayWibString(4),
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      openCreateRoom,
    }),
    [openCreateRoom],
  );

  const openEditRoom = (room: RoomSummary) => {
    dispatch({ type: "OPEN_EDIT", room });
  };

  const handleDeleteRoom = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/v1/rooms/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal menghapus ruang temu.");
        return;
      }
      toast.success(`Ruang temu "${title}" dihapus.`);
      await onRefresh();
    } catch {
      toast.error("Gagal menghapus ruang temu.");
    }
  };

  const copyRoomLink = (roomId: string) => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success("Tautan ruang temu disalin ke papan klip.");
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="font-serif text-xl">
            Daftar Ruang Temu
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="owned">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="owned" className="flex-1">
                Dibuat oleh Saya ({ownedRooms.length})
              </TabsTrigger>
              <TabsTrigger value="joined" className="flex-1">
                Diikuti ({joinedRooms.length})
              </TabsTrigger>
            </TabsList>

            <OwnedRoomsTab
              rooms={ownedRooms}
              onCreateRoom={openCreateRoom}
              onEditRoom={openEditRoom}
              onDeleteRoom={handleDeleteRoom}
              onCopyLink={copyRoomLink}
            />

            <JoinedRoomsTab rooms={joinedRooms} onCopyLink={copyRoomLink} />
          </Tabs>
        </CardContent>
      </Card>

      <RoomDialog form={form} dispatch={dispatch} onRefresh={onRefresh} />
    </>
  );
}
