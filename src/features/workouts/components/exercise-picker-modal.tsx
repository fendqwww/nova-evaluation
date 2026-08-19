"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Plus, Search } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { ExerciseIllustration } from "@/features/workouts/components/exercise-illustration";
import {
  EXERCISE_CATALOG,
  searchCatalog,
  type CatalogCategoryId,
  type CatalogExercise,
} from "@/features/workouts/lib/exercise-catalog";
import { muscleGroupLabel } from "@/features/workouts/lib/exercise-visual";

/**
 * Выбор упражнения из справочника.
 *
 * ЧТО ЭТО ЧИНИТ. «Добавить упражнение» открывало пустое поле с подсказкой
 * «Например: жим лёжа» — то есть предлагало вспомнить название самому, в зале,
 * между подходами. Люди писали «жим 2», «спина», «то самое», и дальше на этих
 * строках ломалось всё, что построено на имени: прогресс по упражнению, группа
 * мышц, картинка, поиск. Справочник убирает не набор текста, а необходимость
 * вспоминать.
 *
 * ПОИСК ИЩЕТ ПО ВСЕМУ, ВКЛАДКИ ФИЛЬТРУЮТ ТОЛЬКО ПУСТОЙ ПОИСК. Человек, набравший
 * «бицепс» на вкладке «Ноги», хочет бицепс, а не пустой список: запрос сильнее
 * фильтра, и это единственное разумное разрешение конфликта. Поэтому при
 * непустом запросе вкладка перестаёт участвовать в отборе.
 *
 * СВОБОДНЫЙ ВВОД НЕ УБРАН. У людей есть свои движения и свои названия, и
 * справочник из шестидесяти строк не станет полным никогда. Кнопка внизу
 * добавляет упражнение ровно с тем именем, которое набрано в поиске, — то есть
 * ненайденный запрос превращается во ввод одним нажатием, а не тупиком.
 */
export function ExercisePickerModal({
  open,
  onOpenChange,
  onSelect,
  onCreateCustom,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: CatalogExercise) => void;
  /** Ввести своё название — то, что набрано в поиске, может быть пустым. */
  onCreateCustom: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CatalogCategoryId>("chest");

  const trimmed = query.trim();

  const visible = useMemo(() => {
    if (trimmed !== "") return searchCatalog(trimmed, muscleGroupLabel);
    return EXERCISE_CATALOG.find((item) => item.id === category)?.exercises ?? [];
  }, [trimmed, category]);

  function choose(exercise: CatalogExercise) {
    haptics.tap();
    onSelect(exercise);
    setQuery("");
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="flex max-h-[88dvh] flex-col overflow-hidden">
        <ModalHeader>
          <ModalTitle>Выбор упражнения</ModalTitle>
        </ModalHeader>

        {/* flex-1 + min-h-0 — обязательная пара, а не украшение: без flex-1
            блок сжимается по содержимому и список внутри не получает высоты, в
            которую можно скроллить, без min-h-0 flex-элемент отказывается быть
            меньше своего содержимого и список выдавливает лист за экран. */}
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск упражнения"
              aria-label="Поиск упражнения"
              className="pl-10"
            />
          </div>

          {/* Лента вкладок прокручивается и уходит под край экрана — тот же
              приём, что у HealthSectionTabs: семь частей тела в строку не
              помещаются ни на одном телефоне, а обрез у самого края читается
              как продолжение, а не как обрыв. Во время поиска лента скрыта:
              она бы показывала выбор, который ни на что не влияет. */}
          {trimmed === "" && (
            <div className="-mx-6 flex gap-2 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {EXERCISE_CATALOG.map((item) => {
                const active = item.id === category;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (!active) haptics.selection();
                      setCategory(item.id);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "press-sm shrink-0 rounded-full px-3.5 py-2 text-caption font-medium transition-colors duration-200",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "bg-fill-muted text-muted-foreground active:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<Search className="h-5 w-5" />}
              title="Ничего не найдено"
              description="В справочнике такого нет — можно записать своё название."
              action={
                <Button onClick={() => onCreateCustom(trimmed)}>
                  <Plus className="h-4 w-4" />
                  Добавить «{trimmed}»
                </Button>
              }
            />
          ) : (
            <ul className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
              {visible.map((exercise, index) => (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => choose(exercise)}
                    className="press-sm flex w-full items-center gap-3 rounded-xl py-2.5 pl-1 pr-2 text-left active:bg-fill-subtle"
                    // Разделитель между строками, но не под последней: линия у
                    // нижнего края списка читается как обрезанный ряд.
                    style={
                      index === visible.length - 1
                        ? undefined
                        : { boxShadow: "inset 0 -1px 0 0 var(--border)" }
                    }
                  >
                    <ExerciseIllustration name={exercise.name} size="sm" />

                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-body font-medium text-foreground">
                        {exercise.name}
                      </span>
                      <span className="truncate text-caption text-muted-foreground">
                        {muscleGroupLabel(exercise.group)} · {exercise.equipment}
                      </span>
                    </span>

                    <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {visible.length > 0 && (
            <Button
              variant="secondary"
              className="w-full shrink-0"
              onClick={() => onCreateCustom(trimmed)}
            >
              <Plus className="h-4 w-4" />
              Своё упражнение
            </Button>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
