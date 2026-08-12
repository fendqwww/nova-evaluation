"use client";

import { useRouter } from "next/navigation";
import {
  Camera,
  Droplet,
  Dumbbell,
  ListTodo,
  Moon,
  Repeat,
  Scale,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/shared/ui/modal";
import { IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";

type Tone = "goal" | "habit" | "task" | "score" | "ai" | "accent";

interface RecordOption {
  key: string;
  label: string;
  hint: string;
  icon: typeof Camera;
  tone: Tone;
  href: string;
}

/**
 * The health acts, first and largest. Ordering is by how often a person does
 * the thing, not by which section of the app owns it — recording a meal is a
 * three-times-a-day act and creating a goal is a once-a-month one, and a menu
 * that sorted them by module would put them side by side as equals.
 */
const HEALTH: RecordOption[] = [
  {
    key: "food",
    label: "Приём пищи",
    hint: "Выбрать из своих продуктов",
    icon: UtensilsCrossed,
    tone: "score",
    href: "/nutrition?add=food",
  },
  {
    key: "photo",
    label: "Еда по фото",
    hint: "Nova посчитает КБЖУ сама",
    icon: Camera,
    tone: "ai",
    href: "/nutrition?add=photo",
  },
  {
    // Ведёт на экран, а не в модалку: стакан отмечается прямо в дневнике
    // карточкой воды, и отдельной формы у него нет. Раньше здесь стоял
    // `?add=water`, который никто не читал, — нажатие просто открывало
    // «Питание», но обещало форму.
    key: "water",
    label: "Вода",
    hint: "Отметить стакан в дневнике",
    icon: Droplet,
    tone: "accent",
    href: "/nutrition",
  },
  {
    key: "sleep",
    label: "Сон",
    hint: "Во сколько лёг и встал",
    icon: Moon,
    tone: "goal",
    href: "/sleep?add=1",
  },
  {
    // Тоже экран, а не модалка, и это осознанно. Начать сессию по ссылке
    // значило бы создать строку в базе на переходе — переоткрытие вкладки или
    // «назад» плодили бы пустые тренировки. Экран «Тренировки» открывается
    // карточкой сегодняшней тренировки с кнопкой старта, то есть тем же
    // действием, но по нажатию человека.
    key: "workout",
    label: "Тренировка",
    hint: "Сегодняшняя — с кнопкой старта",
    icon: Dumbbell,
    tone: "task",
    href: "/workouts",
  },
  {
    // Последним в ряду здоровья: взвешиваются раз в неделю, а не трижды в день.
    // Но именно из этой записи считается прогресс цели, поэтому у неё должен
    // быть вход рядом с остальными, а не только внутри профиля.
    key: "weight",
    label: "Вес",
    hint: "Из него считается прогресс цели",
    icon: Scale,
    tone: "score",
    href: "/profile?add=weight",
  },
];

/** The planning acts. Same sheet, quieter row — they are rarer, not lesser. */
const PLAN: RecordOption[] = [
  { key: "goal", label: "Цель", hint: "", icon: Target, tone: "goal", href: "/goals?add=1" },
  { key: "habit", label: "Привычка", hint: "", icon: Repeat, tone: "habit", href: "/habits?add=1" },
  { key: "task", label: "Задача", hint: "", icon: ListTodo, tone: "task", href: "/tasks?add=1" },
];

/**
 * Полный список того, что можно записать.
 *
 * Every destination carries an `?add=` query the target screen reads on mount
 * and opens the right modal for. That indirection is deliberate: the sheet
 * would otherwise need to own the state of five different forms belonging to
 * five different features, and the screens already know how to open their own.
 *
 * ЧТО ИЗМЕНИЛОСЬ. Лист открывался центральной кнопкой «+» в панели вкладок;
 * теперь его открывает «Ещё» в блоке быстрых действий на главном экране, а
 * четыре самых частых записи (фото еды, приём пищи, тренировка, сон) стали там
 * же отдельными плитками. Поэтому у листа появился `omitKeys`: показывать в
 * «Ещё» то, что человек только что видел плиткой рядом, — это удвоение, ровно
 * то, от чего быстрые действия и должны были избавить.
 */
export function RecordSheet({
  open,
  onOpenChange,
  omitKeys,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ключи, уже показанные вызывающим экраном отдельными кнопками. */
  omitKeys?: readonly string[];
}) {
  const router = useRouter();
  const omitted = new Set(omitKeys ?? []);
  const health = HEALTH.filter((option) => !omitted.has(option.key));
  const plan = PLAN.filter((option) => !omitted.has(option.key));

  function go(href: string) {
    haptics.tap();
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Записать</ModalTitle>
          <ModalDescription>Что произошло — Nova учтёт это в счёте дня.</ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {health.map((option) => {
              const Icon = option.icon;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => go(option.href)}
                  className="press flex items-center gap-3 rounded-xl border border-border bg-fill-subtle px-3.5 py-3 text-left active:border-border-strong"
                >
                  <IconChip tone={option.tone} size="md">
                    <Icon className="h-4 w-4" />
                  </IconChip>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-body font-medium text-foreground">{option.label}</span>
                    <span className="text-caption text-muted-foreground">{option.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Разделитель только когда сверху действительно что-то есть —
              иначе `omitKeys` мог бы оставить лист, начинающийся с линии. */}
          <div
            className={cn(
              "flex flex-col gap-2",
              health.length > 0 && "border-t border-border pt-4",
            )}
          >
            <p className="text-section text-muted-foreground">В план</p>
            <div className="grid grid-cols-3 gap-2">
              {plan.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => go(option.href)}
                    className={cn(
                      "press flex flex-col items-center gap-2 rounded-xl border border-border px-2 py-3",
                      "active:border-border-strong",
                    )}
                  >
                    <IconChip tone={option.tone} size="sm">
                      <Icon className="h-3.5 w-3.5" />
                    </IconChip>
                    <span className="text-caption font-medium text-foreground">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
