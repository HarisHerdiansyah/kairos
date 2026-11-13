"use client";

import type { OpenRoomViewProps } from "@/types/room";
import { AnonymousGateBanner } from "@/components/room/AnonymousGateBanner";
import { ParticipantListCard } from "@/components/room/ParticipantListCard";
import { RecommendationCard } from "@/components/room/RecommendationCard";
import { TimefulGrid } from "@/components/room/TimefulGrid";

export function OpenRoomView({
  data,
  highlightedWindow,
  resettingGrid,
  onJoined,
  onSaveAvailabilityBatch,
  onResetToPersonalSchedule,
  onHoverWindow,
  onSelectLock,
  onCopyLink,
}: OpenRoomViewProps) {
  const { room, actor, participants, calculation } = data;

  return (
    <div className="space-y-6">
      {actor.actor_type === "anonymous" && (
        <AnonymousGateBanner roomId={room.id} onJoined={onJoined} />
      )}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <TimefulGrid
            room={room}
            actor={actor}
            participants={participants}
            calculation={calculation}
            personalGrid={data.personal_grid}
            personalRoomInput={data.personal_room_input}
            highlightedWindow={highlightedWindow}
            resettingGrid={resettingGrid}
            onSaveAvailabilityBatch={onSaveAvailabilityBatch}
            onResetToPersonalSchedule={onResetToPersonalSchedule}
          />
        </div>

        <div className="space-y-6 lg:col-span-4">
          <RecommendationCard
            room={room}
            actor={actor}
            calculation={calculation}
            highlightedWindow={highlightedWindow}
            onHoverWindow={onHoverWindow}
            onSelectLock={onSelectLock}
            onCopyLink={onCopyLink}
          />

          <ParticipantListCard participants={participants} />
        </div>
      </div>
    </div>
  );
}

