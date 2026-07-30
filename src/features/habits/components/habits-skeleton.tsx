import { Skeleton } from "@/shared/ui/skeleton";
import { Card } from "@/shared/ui/card";

// Mirrors the real card's blocks — title row, streak, week strip — so the list
// doesn't visibly reflow the moment data lands.
export function HabitsSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {[0, 1, 2].map((index) => (
        <Card key={index}>
          <div className="flex flex-col gap-3 p-3.5">
            <div className="flex items-start gap-2.5">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
            <div className="flex items-end justify-between gap-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex justify-between gap-1 border-t border-border pt-3">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
                  <Skeleton className="h-2 w-4" />
                  <Skeleton className="h-7 w-7 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
