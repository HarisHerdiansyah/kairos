"use client";

import { Suspense } from "react";

import { useRoomDetail } from "@/hooks/use-room-detail";
import { ConfirmedRoomView } from "@/components/room/ConfirmedRoomView";
import { LockScheduleDialog } from "@/components/room/LockScheduleDialog";
import { OpenRoomView } from "@/components/room/OpenRoomView";
import { RoomErrorAlert } from "@/components/room/RoomErrorAlert";
import { RoomHeader } from "@/components/room/RoomHeader";
import { RoomPageSkeleton } from "@/components/room/RoomPageSkeleton";

function RoomDetailContent() {
  const {
    state,
    fetchRoomDetail,
    copyRoomLink,
    saveAvailabilityBatch,
    resetToPersonalSchedule,
    setHighlightedWindow,
    openLockModal,
    setLockDialogOpen,
  } = useRoomDetail();

  if (state.loading) {
    return <RoomPageSkeleton />;
  }

  if (state.notFoundError || !state.data) {
    return <RoomErrorAlert message={state.notFoundError} />;
  }

  const { room, actor, participants } = state.data;
  const isConfirmed =
    room.status === "confirmed" && Boolean(room.locked_slot);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <RoomHeader
        room={room}
        isOwner={actor.is_owner}
        onCopyLink={copyRoomLink}
      />

      {isConfirmed ? (
        <ConfirmedRoomView room={room} participants={participants} />
      ) : (
        <OpenRoomView
          data={state.data}
          highlightedWindow={state.highlightedWindow}
          resettingGrid={state.resettingGrid}
          onJoined={() => fetchRoomDetail(true)}
          onSaveAvailabilityBatch={saveAvailabilityBatch}
          onResetToPersonalSchedule={resetToPersonalSchedule}
          onHoverWindow={setHighlightedWindow}
          onSelectLock={openLockModal}
          onCopyLink={copyRoomLink}
        />
      )}

      <LockScheduleDialog
        open={state.lockDialogOpen}
        room={room}
        recommendation={state.selectedRec}
        onOpenChange={setLockDialogOpen}
        onLocked={() => fetchRoomDetail(false)}
      />
    </div>
  );
}

export default function RoomDetailPage() {
  return (
    <Suspense fallback={<RoomPageSkeleton />}>
      <RoomDetailContent />
    </Suspense>
  );
}
