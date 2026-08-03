import { Skeleton } from "@/shared/ui/skeleton";
import { Card } from "@/shared/ui/card";

export function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10.5 w-full rounded-xl" />

      <Card>
        <div className="flex items-center gap-4 p-4">
          <Skeleton className="h-[5.75rem] w-[5.75rem] shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </Card>

      {[0, 1, 2, 3].map((index) => (
        <Card key={index}>
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-[0.625rem]" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}
