import { Skeleton } from "@/shared/ui/skeleton";
import { Card } from "@/shared/ui/card";

// Mirrors the real layout's blocks — macro summary, meal groups — so the
// screen doesn't visibly reflow the moment data lands.
export function NutritionSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      </div>

      <Card>
        <div className="flex items-center gap-4 p-4">
          <Skeleton className="h-18 w-18 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2.5">
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 p-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-[0.625rem]" />
          <Skeleton className="h-4 flex-1" />
        </div>
      </Card>

      {[0, 1].map((index) => (
        <Card key={index}>
          <div className="flex flex-col gap-2.5 p-3.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}
