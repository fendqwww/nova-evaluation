import { Skeleton } from "@/shared/ui/skeleton";

// Mirrors the real dashboard's block heights so the hand-off from skeleton
// to content doesn't visibly reflow.
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-3 w-52" />
        </div>
        <Skeleton className="h-11.5 w-11.5 rounded-full" />
      </div>

      <Skeleton className="h-76 w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-18 w-full rounded-xl" />

      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Skeleton className="h-26 rounded-xl" />
        <Skeleton className="h-26 rounded-xl" />
        <Skeleton className="h-26 rounded-xl" />
      </div>
    </div>
  );
}
