"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { generateProgramAction } from "@/features/workouts/server/generate-program.action";
import {
  PROGRAM_EQUIPMENT,
  PROGRAM_EQUIPMENT_HINTS,
  PROGRAM_EQUIPMENT_LABELS,
  PROGRAM_GOALS,
  PROGRAM_GOAL_LABELS,
  PROGRAM_LEVELS,
  PROGRAM_LEVEL_HINTS,
  PROGRAM_LEVEL_LABELS,
  type ProgramEquipment,
  type ProgramGoal,
  type ProgramLevel,
} from "@/features/workouts/lib/program-plan";

/**
 * Подбор программы: три вопроса на одном экране.
 *
 * ПОЧЕМУ ТРИ, А НЕ ВОСЕМЬ. Каждый вопрос должен менять результат. Цель меняет
 * схему подходов, уровень — структуру недели, оборудование — сами упражнения.
 * Возраст, рост, вес и активность не спрашиваются: они уже известны из
 * онбординга, и переспрашивать их означало бы признаться, что приложение не
 * помнит своего пользователя.
 *
 * ПОЧЕМУ ВСЁ НА ОДНОМ ЭКРАНЕ, А НЕ ВИЗАРДОМ. Три коротких выбора видны целиком:
 * человек сразу понимает, сколько от него хотят, и может изменить первый ответ
 * после третьего, не проходя шаги заново.
 *
 * Ограничения — свободным полем и необязательно. Именно там появляется то, чего
 * ни один список опций не покроет: «болят колени», «нет времени по средам».
 */
export function ProgramBuilderModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const rawInitData = useRawInitData();

  const [goal, setGoal] = useState<ProgramGoal>("fit");
  const [level, setLevel] = useState<ProgramLevel>("beginner");
  const [equipment, setEquipment] = useState<ProgramEquipment>("gym");
  const [limitations, setLimitations] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: generateProgramAction,
    onSuccess: (result) => {
      if (!result.ok) {
        haptics.error();
        setError(result.message);
        return;
      }

      haptics.success();
      onCreated();
      onOpenChange(false);
    },
    onError: () => {
      haptics.error();
      setError("Не удалось собрать программу. Попробуй ещё раз.");
    },
  });

  return (
    <Modal open={open} onOpenChange={mutation.isPending ? () => undefined : onOpenChange}>
      <ModalContent className="max-h-[92dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Подобрать программу</ModalTitle>
          <ModalDescription>
            Три вопроса — и Nova соберёт план на неделю. Возраст, вес и активность она уже знает.
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <Choice
            label="Цель"
            options={PROGRAM_GOALS.map((value) => ({
              value,
              label: PROGRAM_GOAL_LABELS[value],
              hint: null,
            }))}
            value={goal}
            onChange={setGoal}
            disabled={mutation.isPending}
          />

          <Choice
            label="Уровень"
            options={PROGRAM_LEVELS.map((value) => ({
              value,
              label: PROGRAM_LEVEL_LABELS[value],
              hint: PROGRAM_LEVEL_HINTS[value],
            }))}
            value={level}
            onChange={setLevel}
            disabled={mutation.isPending}
          />

          <Choice
            label="Оборудование"
            options={PROGRAM_EQUIPMENT.map((value) => ({
              value,
              label: PROGRAM_EQUIPMENT_LABELS[value],
              hint: PROGRAM_EQUIPMENT_HINTS[value],
            }))}
            value={equipment}
            onChange={setEquipment}
            disabled={mutation.isPending}
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-foreground">
              Ограничения <span className="text-subtle-foreground">— необязательно</span>
            </span>
            <Textarea
              value={limitations}
              maxLength={300}
              disabled={mutation.isPending}
              onChange={(event) => setLimitations(event.target.value)}
              placeholder="Например: болит правое колено, по средам не могу"
            />
          </label>

          {error && <p className="text-caption text-destructive">{error}</p>}

          <Button
            size="lg"
            disabled={mutation.isPending}
            onClick={() => {
              setError(null);
              haptics.tap();
              mutation.mutate({
                rawInitData,
                goal,
                level,
                equipment,
                limitations: limitations.trim() === "" ? null : limitations.trim(),
              });
            }}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Nova собирает программу
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Собрать программу
              </>
            )}
          </Button>

          <p className="rounded-xl border border-border bg-fill-subtle p-3 text-[0.6875rem] leading-snug text-subtle-foreground">
            Программа появится как обычные тренировки — их можно править, переносить на другие дни
            и удалять. Существующие программы останутся на месте.
          </p>
        </div>
      </ModalContent>
    </Modal>
  );
}

/**
 * Один выбор из двух-трёх вариантов.
 *
 * Сетка кнопок, а не выпадающий список: все варианты видны сразу, и выбор
 * делается одним нажатием вместо двух. При трёх вариантах список экономил бы
 * место, которого здесь не жалко.
 */
function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: T; label: string; hint: string | null }[];
  value: T;
  onChange: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption font-medium text-foreground">{label}</span>

      <div className="flex flex-col gap-1.5">
        {options.map((option) => {
          const isActive = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={isActive}
              onClick={() => {
                haptics.selection();
                onChange(option.value);
              }}
              className={cn(
                "press-sm flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-200",
                isActive
                  ? "border-accent-border bg-accent-soft"
                  : "border-border bg-fill-subtle active:border-border-strong",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  isActive ? "border-accent" : "border-border-strong",
                )}
              >
                {isActive && <span className="h-2 w-2 rounded-full bg-accent" />}
              </span>

              <span className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    "text-caption font-medium",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </span>
                {option.hint && (
                  <span className="text-[0.6875rem] text-subtle-foreground">{option.hint}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
