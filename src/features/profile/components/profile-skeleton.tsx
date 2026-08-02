import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

// Mirrors the real layout — identity card, score, stat grid, chart — so the
// screen doesn't visibly reflow the moment data lands.
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex items-center gap-4 p-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-5 p-4">
          <Skeleton className="h-19.5 w-19.5 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-56 w-full rounded-xl" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-34 rounded-xl" />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-52 w-full rounded-2xl" />
      </div>

      <Skeleton className="h-18 w-full rounded-xl" />
    </div>
  );
}
