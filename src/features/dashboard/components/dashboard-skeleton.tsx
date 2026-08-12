import { Skeleton } from "@/shared/ui/skeleton";

/**
 * Повторяет высоты и ПОРЯДОК настоящих блоков «Сегодня», чтобы переход от
 * заглушки к содержимому не двигал экран: шапка с выводом, герой (индекс плюс
 * четыре кольца состояния), разбор коуча, лента плана, быстрые действия и блок
 * направления (путь плюс фокус дня одной карточкой).
 *
 * Порядок здесь обязан совпадать с DashboardView построчно. Заглушка, у которой
 * блоки идут иначе, чем содержимое, — это не заглушка, а вторая раскладка того
 * же экрана, и человек видит, как она перестраивается.
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

      {/* Разбор коуча — теперь сразу под героем, до плана дня. */}
      <Skeleton className="h-64 w-full rounded-xl" />

      {/* План на сегодня: заголовок со счётчиком и лента строк. */}
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>

      {/* Быстрые действия: заголовок с «Ещё» и сетка 2×2 из плиток. */}
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3.5 w-36" />
        <div className="grid grid-cols-2 gap-2.5">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>

      {/* Путь и фокус дня — одна карточка, две части. */}
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
