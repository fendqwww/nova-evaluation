import { Skeleton } from "@/shared/ui/skeleton";

/**
 * Повторяет высоты настоящих блоков «Сегодня», чтобы переход от заглушки к
 * содержимому не двигал экран: шапка с выводом, герой (индекс плюс четыре
 * кольца состояния), лента плана, карточка коуча, путь и фокус дня.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-6 w-44" />
          </div>
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>

      {/* Герой: кольцо 168px, вердикт и сетка из четырёх ячеек под разделителем. */}
      <Skeleton className="h-116 w-full rounded-xl" />

      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>

      <Skeleton className="h-64 w-full rounded-xl" />

      <Skeleton className="h-40 w-full rounded-xl" />

      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
