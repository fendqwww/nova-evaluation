import { Skeleton } from "@/shared/ui/skeleton";
import { Card } from "@/shared/ui/card";

export function SleepSkeleton() {
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

      <Card>
        <div className="flex flex-col gap-2.5 p-4">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    </div>
  );
}
