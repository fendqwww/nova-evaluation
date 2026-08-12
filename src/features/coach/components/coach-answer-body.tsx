"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { actionHref, bulletDotClass, bulletTextClass } from "@/features/coach/lib/tone";
import type { CoachAnswer } from "@/features/coach/types";

/**
 * A CoachAnswer, rendered once.
 *
 * The daily brief and every reply in the chat are the same shape, so they are
 * the same component — which is also what guarantees a Gemini-written answer
 * and a rules-written one are visually indistinguishable. They are equally
 * real; only the prose differs.
 *
 * ДВА РАЗМЕРА ОДНОГО И ТОГО ЖЕ ОТВЕТА. Разбор дня и реплика в чате — это разные
 * по весу высказывания, хотя структура у них одна. Разбор человек читает первым
 * и один раз за день: его вывод — самая важная строка во всём приложении, и на
 * 17px он выглядел как заголовок карточки, то есть как подпись к чему-то, а не
 * как мысль. В `brief` он набирается 22px и становится тем, ради чего экран
 * открывают.
 *
 * Там же ограничивается длина: три пункта объяснения вместо всех, что прислала
 * модель. Тренер, который говорит пять причин подряд, не тренер, а отчёт —
 * а `rationale` и действие под ними доносят остальное лучше четвёртого пункта.
 * В чате ограничения нет: там человек сам задал вопрос и ждёт полного ответа.
 */
const BRIEF_MAX_BULLETS = 3;

export function CoachAnswerBody({
  answer,
  className,
  variant = "reply",
}: {
  answer: CoachAnswer;
  className?: string;
  /** `brief` — разбор дня, `reply` — реплика в диалоге. */
  variant?: "brief" | "reply";
}) {
  const isBrief = variant === "brief";
  const bullets = isBrief ? answer.bullets.slice(0, BRIEF_MAX_BULLETS) : answer.bullets;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-1.5">
        <p
          className={cn(
            "wrap-break-word text-foreground",
            isBrief ? "text-page" : "text-title",
          )}
        >
          {answer.headline}
        </p>
        <p
          className={cn(
            "wrap-break-word text-caption text-muted-foreground",
            // Короткое объяснение — именно короткое. Модель иногда присылает
            // абзац, и в разборе дня он вытесняет собой действие под ним.
            isBrief && "line-clamp-3",
          )}
        >
          {answer.body}
        </p>
      </div>

      {bullets.length > 0 && (
        <ul className="flex flex-col gap-2">
          {bullets.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5">
              {/* A 5px dot rather than an icon per tone: six different glyphs
                  in one card reads as decoration, a column of dots reads as a
                  list with severity. */}
              <span
                aria-hidden
                className={cn(
                  "mt-[0.4375rem] h-[0.3125rem] w-[0.3125rem] shrink-0 rounded-full",
                  bulletDotClass(item.tone),
                )}
              />
              <span className={cn("text-caption", bulletTextClass(item.tone))}>
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      {answer.rationale && (
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-fill-subtle p-3">
          <p className="text-label uppercase text-subtle-foreground">Почему это важно</p>
          <p className="wrap-break-word text-caption text-muted-foreground">
            {answer.rationale}
          </p>
        </div>
      )}

      {answer.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {answer.actions.map((action) => {
            const href = actionHref(action.target);

            // An action with nowhere to go is still advice worth showing — it
            // just renders as a static chip instead of a link, rather than
            // being dropped or faked into a dead button.
            if (!href) {
              return (
                <span
                  key={action.id}
                  className="rounded-lg border border-border bg-fill-subtle px-3 py-1.5 text-caption font-medium text-muted-foreground"
                >
                  {action.label}
                </span>
              );
            }

            return (
              <Link
                key={action.id}
                href={href}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-accent-border bg-accent-soft px-3 py-1.5 text-caption font-medium text-accent transition-colors duration-200 active:bg-accent-muted"
              >
                {action.label}
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-active:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
