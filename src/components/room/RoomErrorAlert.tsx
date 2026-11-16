import { AlertTriangle } from "lucide-react";

import type { RoomErrorAlertProps } from "@/types/room";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function RoomErrorAlert({ message }: RoomErrorAlertProps) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Ruang temu tidak dapat dimuat</AlertTitle>
        <AlertDescription>
          {message || "Periksa kembali tautan ruang temu yang Anda buka."}
        </AlertDescription>
      </Alert>
    </div>
  );
}

