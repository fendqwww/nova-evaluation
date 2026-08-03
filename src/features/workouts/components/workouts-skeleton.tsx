import { Skeleton } from "@/shared/ui/skeleton";
import { Card } from "@/shared/ui/card";

// Mirrors the real layout's blocks — the tab pill, the week hero, then each
// card's title row / streak / footer — so nothing visibly reflows or pops in
// once the tabs and data land.
export function WorkoutsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10.5 w-full rounded-xl" />

      <Card>
        <div className="flex items-center gap-4 p-4">
          <Skeleton className="h-18 w-18 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-2.5">
        {[0, 1, 2].map((index) => (
          <Card key={index}>
            <div className="flex flex-col gap-3 p-3.5">
              <div className="flex items-start gap-2.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
              </div>
              <div className="flex items-end justify-between gap-3">
                <Skeleton className="h-8 w-28" />
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="flex justify-between gap-2 border-t border-border pt-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
