import { Skeleton } from "@/shared/ui/skeleton";

// Mirrors the real screen's block heights so the hand-off from skeleton to
// content doesn't visibly reflow.
export function CoachSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3.5 w-56" />
      </div>

      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />

      <div className="flex gap-2">
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="h-9 w-36 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>

      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
