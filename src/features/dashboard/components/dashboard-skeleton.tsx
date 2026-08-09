import { Skeleton } from "@/shared/ui/skeleton";

// Mirrors the real dashboard's block heights so the hand-off from skeleton
// to content doesn't visibly reflow: greeting, the score hero, the four
// "Сегодня" tiles, the Coach card and the focus row.
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>

      <Skeleton className="h-88 w-full rounded-xl" />

      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3.5 w-20" />
        <div className="grid grid-cols-2 gap-2.5">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>

      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-18 w-full rounded-xl" />
    </div>
  );
}
