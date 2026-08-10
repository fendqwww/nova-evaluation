import { Skeleton } from "@/shared/ui/skeleton";

/** Повторяет высоты шапки пути и трёх карточек этапов, чтобы экран не дёргался. */
export function PathSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-xl" />
    </div>
  );
}
