import { Skeleton } from "@/shared/ui/skeleton";
import { Card } from "@/shared/ui/card";

// Mirrors the real list — a group heading over compact rows — so the screen
// doesn't visibly reflow the moment data lands.
export function TasksSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1].map((group) => (
        <div key={group} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          {[0, 1, 2].map((row) => (
            <Card key={row}>
              <div className="flex items-start gap-2.5 p-3">
                <Skeleton className="h-6 w-6 rounded-md" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
