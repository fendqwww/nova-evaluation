"use client";

import Link from "next/link";
import { Brain, ChevronRight } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import {
  GENDER_LABELS,
  OCCUPATION_LABELS,
  PRIMARY_GOAL_LABELS,
} from "@/features/onboarding/schemas";
import type { AiProfileFacts } from "@/features/profile/types";

/**
 * "Nova знает о тебе" — the data the Coach actually reasons over.
 *
 * Not a settings form. Every value here is read from the same analysis the
 * Coach is handed (see get-profile-overview.action.ts), so the card is a true
 * statement about what the model sees rather than a plausible-looking summary
 * assembled separately. That is the point of showing it at all: a user should
 * be able to find out what an AI knows about them without asking it.
 *
 * Editing happens where the data is owned — the body facts come from
 * onboarding, so the card links there rather than growing a second form over
 * the same Profile row.
 *
 * When the Coach is switched off the card says so and stops describing what it
 * "knows", because at that point it is not being told anything.
 */
export function AiProfileCard({ ai }: { ai: AiProfileFacts }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-section text-subtle-foreground">AI Profile</h2>

      <Card elevation="accent">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-start gap-3">
            <IconChip tone="ai" size="lg">
              <Brain className="h-5 w-5" />
            </IconChip>

            <div className="flex flex-col gap-0.5">
              <p className="text-title text-foreground">Nova знает о тебе</p>
              <p className="text-caption text-muted-foreground">
                {ai.isCoachEnabled
                  ? "На эти данные опирается AI Coach, когда отвечает"
                  : "AI Coach выключен — эти данные никуда не отправляются"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-y-4 rounded-xl border border-border bg-input p-3.5">
            <Fact label="Возраст" value={`${ai.age}`} />
            <Fact label="Рост" value={`${ai.heightCm} см`} />
            <Fact label="Вес" value={`${ai.weightKg} кг`} />
            <Fact label="Пол" value={GENDER_LABELS[ai.gender]} />
            <Fact
              label="ИМТ"
              value={ai.bmi === 0 ? "—" : `${ai.bmi}`}
              hint={ai.bmi === 0 ? undefined : ai.bmiLabel}
            />
            <Fact label="Пояс" value={shortZone(ai.timezone)} />
          </div>

          <div className="flex flex-col gap-2.5">
            <Row label="Деятельность" value={OCCUPATION_LABELS[ai.occupation]} />
            <Row label="Фокус" value={PRIMARY_GOAL_LABELS[ai.primaryGoal]} />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-caption text-subtle-foreground">
              Активные цели ({ai.activeGoalTitles.length})
            </p>

            {ai.activeGoalTitles.length === 0 ? (
              <p className="text-caption text-muted-foreground">
                Целей пока нет — коуч опирается только на привычки и задачи.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {/* Three at most: the card is a summary of what the model sees,
                    and a user with fifteen goals does not need all of them
                    restated here — /goals is one tap away. */}
                {ai.activeGoalTitles.slice(0, 3).map((title) => (
                  <li key={title} className="flex gap-2 text-caption text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    <span className="truncate">{title}</span>
                  </li>
                ))}
                {ai.activeGoalTitles.length > 3 && (
                  <li className="text-caption text-subtle-foreground">
                    и ещё {ai.activeGoalTitles.length - 3}
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Points at Настройки rather than straight at /onboarding: the flow
              is guarded in production and bounces a completed user back to the
              Dashboard, so the only working way in is the reset action that
              clears the completion stamp first — and that action has one owner,
              the account group in Настройки. */}
          <Link
            href="/settings"
            className="flex items-center justify-between gap-2 rounded-xl border border-border px-3.5 py-3 text-caption text-muted-foreground transition-colors duration-200 active:text-foreground"
          >
            Изменить данные о себе
            <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption text-subtle-foreground">{label}</span>
      <span className="numeric text-body font-medium text-foreground">{value}</span>
      {hint && <span className="text-caption text-subtle-foreground">{hint}</span>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-caption text-subtle-foreground">{label}</span>
      <span className="truncate text-body text-foreground">{value}</span>
    </div>
  );
}

/** "Europe/Moscow" -> "Moscow". The full identifier is a settings-screen detail. */
function shortZone(timezone: string): string {
  return timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone;
}
