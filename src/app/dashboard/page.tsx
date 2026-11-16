"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import type { RoomCardHandle } from "@/types/dashboard";
import {
  dashboardDataReducer,
  initialDashboardDataState,
} from "@/lib/dashboard-reducers";
import { Button } from "@/components/ui/button";
import { OverrideCard } from "@/components/dashboard/OverrideCard";
import { RoomCard } from "@/components/dashboard/RoomCard";
import { RoutineCard } from "@/components/dashboard/RoutineCard";
import { SkeletonLoading } from "@/components/dashboard/SkeletonLoading";
import { UnauthenticatedView } from "@/components/dashboard/UnauthenticatedView";

export default function DashboardPage() {
  const { status: authStatus } = useSession();
  const [data, dispatch] = useReducer(
    dashboardDataReducer,
    initialDashboardDataState,
  );
  const roomCardRef = useRef<RoomCardHandle>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [schedRes, roomsRes] = await Promise.all([
        fetch("/api/v1/schedule"),
        fetch("/api/v1/rooms"),
      ]);

      if (schedRes.ok) {
        const schedJson = await schedRes.json();
        if (schedJson.success) {
          dispatch({
            type: "SET_SCHEDULE",
            baseline: schedJson.data.baseline || [],
            overrides: schedJson.data.overrides || [],
          });
        }
      }

      if (roomsRes.ok) {
        const roomsJson = await roomsRes.json();
        if (roomsJson.success) {
          dispatch({
            type: "SET_ROOMS",
            ownedRooms: roomsJson.data.owned_rooms || [],
            joinedRooms: roomsJson.data.joined_rooms || [],
          });
        }
      }
    } catch {
      toast.error("Gagal memuat data dashboard. Periksa koneksi Anda.");
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    let active = true;
    Promise.all([fetch("/api/v1/schedule"), fetch("/api/v1/rooms")])
      .then(async ([schedRes, roomsRes]) => {
        if (!active) return;
        if (schedRes.ok) {
          const schedJson = await schedRes.json();
          if (schedJson.success && active) {
            dispatch({
              type: "SET_SCHEDULE",
              baseline: schedJson.data.baseline || [],
              overrides: schedJson.data.overrides || [],
            });
          }
        }
        if (roomsRes.ok) {
          const roomsJson = await roomsRes.json();
          if (roomsJson.success && active) {
            dispatch({
              type: "SET_ROOMS",
              ownedRooms: roomsJson.data.owned_rooms || [],
              joinedRooms: roomsJson.data.joined_rooms || [],
            });
          }
        }
      })
      .catch(() => {
        if (active) {
          toast.error("Gagal memuat data dashboard. Periksa koneksi Anda.");
        }
      })
      .finally(() => {
        if (active) {
          dispatch({ type: "SET_LOADING", loading: false });
        }
      });
    return () => {
      active = false;
    };
  }, [authStatus]);

  if (authStatus === "unauthenticated") {
    return <UnauthenticatedView />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Top Action Bar */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Dashboard
          </h1>
        </div>
        <Button
          size="lg"
          onClick={() => roomCardRef.current?.openCreateRoom()}
          disabled={data.loadingData}
        >
          <Plus className="size-4" />
          <span>Buat sesi penjadwalan</span>
        </Button>
      </div>

      {data.loadingData ? (
        <SkeletonLoading />
      ) : (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Left Column: Personal Schedule (Baseline F2 & Overrides F3) */}
          <div className="flex flex-col gap-8 lg:col-span-7">
            <RoutineCard
              baseline={data.baseline}
              onRefresh={fetchDashboardData}
            />
            <OverrideCard
              baseline={data.baseline}
              overrides={data.overrides}
              onRefresh={fetchDashboardData}
            />
          </div>

          {/* Right Column: Room Management & History (F4) */}
          <div className="lg:col-span-5">
            <RoomCard
              ref={roomCardRef}
              ownedRooms={data.ownedRooms}
              joinedRooms={data.joinedRooms}
              onRefresh={fetchDashboardData}
            />
          </div>
        </div>
      )}
    </div>
  );
}
