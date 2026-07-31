import { Skeleton } from "@/shared/ui/skeleton";
import { Card } from "@/shared/ui/card";

// Mirrors the real layout's blocks — macro summary, meal groups — so the
// screen doesn't visibly reflow the moment data lands.
export function NutritionSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
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
