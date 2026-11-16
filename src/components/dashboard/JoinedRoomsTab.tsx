"use client";

import type { RoomSummary } from "@/types/kairos";
import { TabsContent } from "@/components/ui/tabs";
import { JoinedRoomItem } from "@/components/dashboard/JoinedRoomItem";

interface JoinedRoomsTabProps {
  rooms: RoomSummary[];
  onCopyLink: (id: string) => void;
}

export function JoinedRoomsTab({ rooms, onCopyLink }: JoinedRoomsTabProps) {
  return (
    <TabsContent value="joined" className="space-y-3">
      {rooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm font-medium text-foreground">
            Belum ada ruang temu yang diikuti
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Saat Anda membuka tautan ruang temu milik rekan Anda dalam keadaan
            login, ruang tersebut akan tercatat di sini.
          </p>
        </div>
      ) : (
        rooms.map((room) => (
          <JoinedRoomItem
            key={room.id}
            room={room}
            onCopyLink={onCopyLink}
          />
        ))
      )}
    </TabsContent>
  );
}

