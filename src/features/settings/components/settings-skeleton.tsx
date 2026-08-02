import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

// Mirrors the real layout — the account card, then groups of rows — so the
// screen doesn't visibly reflow the moment data lands.
export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex items-center gap-4 p-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      </Card>

      {[3, 2, 4].map((rows, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Card>
            <div className="flex flex-col gap-4 p-4">
              {Array.from({ length: rows }, (_, row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-[0.625rem]" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
