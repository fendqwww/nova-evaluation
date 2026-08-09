"use client";

import { useRouter } from "next/navigation";
import {
  Camera,
  Droplet,
  Dumbbell,
  ListTodo,
  Moon,
  Repeat,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/shared/ui/modal";
import { IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";

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
    key: "water",
    label: "Вода",
    hint: "Стакан — 250 мл",
    icon: Droplet,
    tone: "accent",
    href: "/nutrition?add=water",
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
    key: "workout",
    label: "Тренировка",
    hint: "Начать сессию по плану",
    icon: Dumbbell,
    tone: "task",
    href: "/workouts?add=1",
  },
];

/** The planning acts. Same sheet, quieter row — they are rarer, not lesser. */
const PLAN: RecordOption[] = [
  { key: "goal", label: "Цель", hint: "", icon: Target, tone: "goal", href: "/goals?add=1" },
  { key: "habit", label: "Привычка", hint: "", icon: Repeat, tone: "habit", href: "/habits?add=1" },
  { key: "task", label: "Задача", hint: "", icon: ListTodo, tone: "task", href: "/tasks?add=1" },
];

/**
 * What the centre button opens.
 *
 * Every destination carries an `?add=` query the target screen reads on mount
 * and opens the right modal for. That indirection is deliberate: the sheet
 * would otherwise need to own the state of five different forms belonging to
 * five different features, and the screens already know how to open their own.
 *
 * The cost this removes: logging a meal used to be Здоровье → Питание → «+» →
 * picker → log, and the first two of those taps existed only because Nutrition
 * lived behind a tab shared with three other sections.
 */
export function RecordSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  function go(href: string) {
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
            {HEALTH.map((option) => {
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

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-section text-muted-foreground">В план</p>
            <div className="grid grid-cols-3 gap-2">
              {PLAN.map((option) => {
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
