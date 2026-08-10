"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { bulletDotClass } from "@/features/coach/lib/tone";
import type { DashboardData } from "@/features/dashboard/server/get-dashboard-data.action";

/**
 * Коуч на главном экране — разбор, а не анонс чата.
 *
 * ЧТО ИЗМЕНИЛОСЬ И ПОЧЕМУ. Карточка показывала заголовок, два предложения и
 * кнопку «Спросить AI Coach». То есть сообщала, что у Nova есть мнение, и
 * предлагала пойти его выяснить — лишний шаг между выводом и действием. При
 * этом CoachAnswer уже содержал `rationale` и `actions`: причина и конкретное
 * действие были посчитаны и просто не доезжали до экрана.
 *
 * Теперь карточка держит форму рассуждения целиком:
 *
 *   что     — headline, вывод одной строкой
 *   почему  — highlight (самый громкий факт дня) и rationale (последствие)
 *   что делать — actions[0], настоящая кнопка в тот раздел, где это чинится
 *
 * «Спросить» осталось, но стало вторичным: диалог нужен для уточнения вывода,
 * а не вместо него.
 */
export function CoachPreviewCard({ coach }: { coach: DashboardData["coach"] }) {
  return (
    <Card elevation="accent">
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-start gap-3">
          <IconChip tone="ai" size="md">
            <Sparkles className="h-4 w-4" />
          </IconChip>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-label uppercase text-muted-foreground">Коуч Nova</p>
              {coach.potential > 0 && (
                <span className="numeric shrink-0 rounded-md bg-accent-muted px-1.5 py-0.5 text-[0.6875rem] font-semibold text-accent">
                  +{coach.potential} сегодня
                </span>
              )}
            </div>

            <p className="mt-1.5 text-title text-foreground">{coach.headline}</p>
            <p className="mt-1 line-clamp-3 text-caption text-muted-foreground">{coach.body}</p>
          </div>
        </div>

        {/* Причина. Отдельным блоком с собственной подложкой, потому что это
            другой род высказывания: выше — вывод, здесь — доказательство.
            Блок исчезает целиком, когда доказывать нечем, вместо того чтобы
            печатать пустой заголовок «Почему». */}
        {(coach.highlight || coach.rationale) && (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-fill-subtle p-3">
            <p className="text-label uppercase text-subtle-foreground">Почему</p>

            {coach.highlight && (
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "mt-[0.375rem] h-[0.3125rem] w-[0.3125rem] shrink-0 rounded-full",
                    bulletDotClass(coach.highlight.tone),
                  )}
                />
                <span className="text-caption text-foreground">{coach.highlight.text}</span>
              </div>
            )}

            {coach.rationale && (
              <p className="text-caption text-muted-foreground">{coach.rationale}</p>
            )}
          </div>
        )}

        {/* Что делать. Основная кнопка ведёт в раздел, где проблема решается, —
            это и есть разница между советом и продуктом. Когда действия нет
            (Nova не нашла, что чинить), «Спросить» поднимается на его место,
            чтобы карточка никогда не заканчивалась ничем. */}
        <div className="flex flex-col gap-2">
          {coach.action ? (
            <>
              <Button asChild size="lg" className="group w-full font-semibold">
                <Link href={coach.action.href} onClick={() => haptics.tap()}>
                  {coach.action.label}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-active:translate-x-0.5" />
                </Link>
              </Button>

              <Button asChild variant="ghost" size="md" className="w-full text-muted-foreground">
                <Link href="/coach?ask=1" onClick={() => haptics.tap()}>
                  <MessageCircle className="h-4 w-4" />
                  Спросить коуча
                </Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg" className="group w-full font-semibold">
              <Link href="/coach?ask=1" onClick={() => haptics.tap()}>
                Спросить AI Coach
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-active:translate-x-0.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
