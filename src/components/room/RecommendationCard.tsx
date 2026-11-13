"use client";

import { AlertTriangle, Copy, Info, Lock, Sparkles } from "lucide-react";

import type { RecommendationCardProps } from "@/types/room";
import { formatDateId } from "@/lib/format-ui";
import { isWindowMatching } from "@/lib/room-grid-utils";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function RecommendationCard({
  room,
  actor,
  calculation,
  highlightedWindow,
  onHoverWindow,
  onSelectLock,
  onCopyLink,
}: RecommendationCardProps) {
  const renderContent = () => {
    if (calculation?.waiting_for_participants) {
      return (
        <Alert>
          <Info className="size-4" />
          <AlertTitle>Menunggu peserta lain bergabung</AlertTitle>
          <AlertDescription className="space-y-2 text-xs">
            <p>
              Saat ini baru ada 1 peserta di dalam ruang temu. Bagikan tautan
              publik agar sistem dapat menghitung irisan waktu kelompok.
            </p>
            <Button variant="outline" size="xs" onClick={onCopyLink}>
              <Copy className="size-3" />
              <span>Salin tautan ruang</span>
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    if (calculation && calculation.best_times.length > 0) {
      return (
        <div className="space-y-3">
          {calculation.best_times.map((rec, idx) => {
            const isActive = isWindowMatching(rec, highlightedWindow);
            return (
              <div
                key={`${rec.date}_${rec.start}_${idx}`}
                onMouseEnter={() =>
                  onHoverWindow({
                    date: rec.date,
                    start: rec.start,
                    end: rec.end,
                  })
                }
                onMouseLeave={() => onHoverWindow(null)}
                className={cn(
                  "flex flex-col gap-2.5 rounded-2xl border bg-background p-3.5 transition-colors",
                  isActive
                    ? "border-primary bg-accent/20"
                    : "border-border hover:border-primary/50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-sans text-xs font-semibold text-primary">
                      #{idx + 1} Best Time
                    </span>
                    <h3 className="font-serif text-sm font-semibold text-foreground">
                      {formatDateId(rec.date)}
                    </h3>
                    <p className="font-sans text-xs font-medium text-foreground">
                      {rec.start} – {rec.end} WIB
                    </p>
                  </div>

                  <Badge variant="default" className="font-sans text-[11px]">
                    {rec.available_count}/{rec.total_participants} hadir
                  </Badge>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                  <span className="font-sans">
                    Durasi luang: {rec.duration_min} menit
                  </span>

                  {actor.is_owner && (
                    <Button size="xs" onClick={() => onSelectLock(rec)}>
                      <Lock className="size-3" />
                      <span>Pilih & Kunci</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (calculation && calculation.deadlock.is_deadlock) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Deadlock — Tidak Ada Irisan Kelompok</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            Tidak ditemukan satu pun slot waktu yang dihadiri lebih dari 1
            peserta secara bersamaan. Peserta disarankan menandai{" "}
            <span className="font-semibold">Tetap Hadir (Override)</span> pada
            beberapa slot sibuk atau menambah waktu luang agar rapat dapat
            dijadwalkan.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Kuorum / Durasi Penuh Belum Tercapai</AlertTitle>
          <AlertDescription className="text-xs">
            Belum ada jendela waktu yang memenuhi kuorum ({room.quorum} peserta)
            sekaligus durasi penuh ({room.duration_min} menit). Berikut adalah
            opsi toleransi yang masih dihadiri lebih dari 1 peserta:
          </AlertDescription>
        </Alert>

        {calculation && calculation.deadlock.partial_options.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">
              Opsi Peserta Parsial (Durasi Penuh ≥ {room.duration_min} mnt)
            </h4>
            {calculation.deadlock.partial_options.map((rec, idx) => {
              const isActive = isWindowMatching(rec, highlightedWindow);
              return (
                <div
                  key={`partial_${rec.date}_${rec.start}_${idx}`}
                  onMouseEnter={() =>
                    onHoverWindow({
                      date: rec.date,
                      start: rec.start,
                      end: rec.end,
                    })
                  }
                  onMouseLeave={() => onHoverWindow(null)}
                  className={cn(
                    "flex flex-col gap-2 rounded-2xl border bg-background p-3 transition-colors",
                    isActive
                      ? "border-primary bg-accent/20"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-serif text-sm font-semibold text-foreground">
                        {formatDateId(rec.date)}
                      </p>
                      <p className="font-sans text-xs text-foreground">
                        {rec.start} – {rec.end} WIB
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-sans text-[11px]">
                      {rec.available_count}/{rec.total_participants} hadir
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                    <span className="font-sans">
                      Durasi luang: {rec.duration_min} mnt
                    </span>
                    {actor.is_owner && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => onSelectLock(rec)}
                      >
                        <Lock className="size-3" />
                        <span>Pilih & Kunci</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {calculation && calculation.deadlock.shorter_options.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">
              Opsi Durasi Lebih Singkat (&lt; {room.duration_min} mnt)
            </h4>
            {calculation.deadlock.shorter_options.map((rec, idx) => {
              const isActive = isWindowMatching(rec, highlightedWindow);
              return (
                <div
                  key={`shorter_${rec.date}_${rec.start}_${idx}`}
                  onMouseEnter={() =>
                    onHoverWindow({
                      date: rec.date,
                      start: rec.start,
                      end: rec.end,
                    })
                  }
                  onMouseLeave={() => onHoverWindow(null)}
                  className={cn(
                    "flex flex-col gap-2 rounded-2xl border bg-background p-3 transition-colors",
                    isActive
                      ? "border-primary bg-accent/20"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-serif text-sm font-semibold text-foreground">
                        {formatDateId(rec.date)}
                      </p>
                      <p className="font-sans text-xs text-foreground">
                        {rec.start} – {rec.end} WIB
                      </p>
                    </div>
                    <Badge variant="outline" className="font-sans text-[11px]">
                      {rec.available_count}/{rec.total_participants} hadir
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                    <span className="font-sans">
                      Durasi tersedia: {rec.duration_min} mnt
                    </span>
                    {actor.is_owner && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => onSelectLock(rec)}
                      >
                        <Lock className="size-3" />
                        <span>Pilih & Kunci</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg">
            Rekomendasi Waktu (Best Time)
          </CardTitle>
          <Sparkles className="size-4 text-primary" />
        </div>
        <CardDescription className="text-xs">
          Arahkan kursor pada kartu rekomendasi untuk menyorot posisi jam di
          atas kalender.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">{renderContent()}</CardContent>
    </Card>
  );
}

