import { Skeleton } from "@/components/ui/skeleton";

export function RoomPageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-28 w-full rounded-3xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Skeleton className="h-96 w-full rounded-3xl lg:col-span-8" />
        <Skeleton className="h-96 w-full rounded-3xl lg:col-span-4" />
      </div>
    </div>
  );
}

