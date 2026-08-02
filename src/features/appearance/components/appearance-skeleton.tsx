import { Skeleton } from "@/shared/ui/skeleton";
import { Card } from "@/shared/ui/card";

// Mirrors the real layout's blocks — the day summary, then a stack of routine
// cards — so the screen doesn't visibly reflow the moment data lands.
export function AppearanceSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex items-center gap-4 p-4">
          <Skeleton className="h-21 w-21 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      </Card>
      {[0, 1, 2].map((index) => (
        <Card key={index}>
          <div className="flex flex-col gap-2.5 p-3.5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-[0.625rem]" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-8 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}
