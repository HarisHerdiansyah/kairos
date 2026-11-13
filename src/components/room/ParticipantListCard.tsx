"use client";

import { Users } from "lucide-react";

import type { ParticipantListCardProps } from "@/types/room";
import { getParticipantRoleSuffix } from "@/lib/room-grid-utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ParticipantListCard({
  participants,
}: ParticipantListCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-base">
            Peserta Bergabung ({participants.length})
          </CardTitle>
          <Users className="size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <Badge
              key={p.id}
              variant={p.is_owner ? "default" : "secondary"}
              className="px-3 py-1"
            >
              {p.name}
              {getParticipantRoleSuffix(p)}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
