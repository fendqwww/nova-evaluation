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
 */
export function CoachAnswerBody({
  answer,
  className,
}: {
  answer: CoachAnswer;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-1.5">
        <p className="wrap-break-word text-title text-foreground">{answer.headline}</p>
        <p className="wrap-break-word text-caption text-muted-foreground">{answer.body}</p>
      </div>

      {answer.bullets.length > 0 && (
        <ul className="flex flex-col gap-2">
          {answer.bullets.map((item) => (
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
                  className="rounded-lg border border-border bg-white/[0.03] px-3 py-1.5 text-[0.8125rem] font-medium text-muted-foreground"
                >
                  {action.label}
                </span>
              );
            }

            return (
              <Link
                key={action.id}
                href={href}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-accent-border bg-accent-soft px-3 py-1.5 text-[0.8125rem] font-medium text-accent transition-colors duration-200 active:bg-accent-muted"
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
