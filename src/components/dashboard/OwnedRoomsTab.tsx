"use client";

import { Plus } from "lucide-react";

import type { RoomSummary } from "@/types/kairos";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { OwnedRoomItem } from "@/components/dashboard/OwnedRoomItem";

interface OwnedRoomsTabProps {
  rooms: RoomSummary[];
  onCreateRoom: () => void;
  onEditRoom: (room: RoomSummary) => void;
  onDeleteRoom: (id: string, title: string) => void;
  onCopyLink: (id: string) => void;
}

export function OwnedRoomsTab({
  rooms,
  onCreateRoom,
  onEditRoom,
  onDeleteRoom,
  onCopyLink,
}: OwnedRoomsTabProps) {
  return (
    <TabsContent value="owned" className="space-y-3">
      {rooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm font-medium text-foreground">
            Anda belum membuat sesi
          </p>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            Buat sesi baru dan undang rekan satu tim.
          </p>
          <Button onClick={onCreateRoom}>
            <Plus className="size-4" />
            <span>Buat sesi</span>
          </Button>
        </div>
      ) : (
        rooms.map((room) => (
          <OwnedRoomItem
            key={room.id}
            room={room}
            onEdit={onEditRoom}
            onDelete={onDeleteRoom}
            onCopyLink={onCopyLink}
          />
        ))
      )}
    </TabsContent>
  );
}
