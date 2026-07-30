import { Skeleton } from "@/shared/ui/skeleton";
import { Card } from "@/shared/ui/card";

// Mirrors the real card's blocks — title row, headline percentage, bar, footer —
// so the list doesn't visibly reflow the moment data lands.
export function GoalsSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {[0, 1, 2].map((index) => (
        <Card key={index}>
          <div className="flex flex-col gap-3 p-3.5">
            <div className="flex items-start gap-2.5">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="mt-1 h-4 flex-1" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <div className="flex items-end justify-between gap-3">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-2.5 w-full rounded-full" />
            <div className="border-t border-border pt-2.5">
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
