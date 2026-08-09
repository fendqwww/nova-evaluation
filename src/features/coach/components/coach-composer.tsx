"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { Textarea } from "@/shared/ui/textarea";
import { COACH_QUESTION_MAX } from "@/features/coach/schemas";

/**
 * The question field.
 *
 * Enter sends and Shift+Enter breaks the line, the convention every chat on a
 * phone already trained the user on. The field clears only once the send has
 * been handed off, so a question is never lost to a mis-tap.
 */
export function CoachComposer({
  onSend,
  disabled,
  autoFocus = false,
}: {
  onSend: (question: string) => void;
  disabled: boolean;
  /**
   * Set when the screen was opened by the Dashboard's "Спросить AI Coach"
   * button. Someone who pressed a button that says "ask" has already decided to
   * type; landing them at the top of a long analysis with the field two screens
   * down would make them scroll to reach what they just chose.
   */
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !disabled;

  function send() {
    if (!canSend) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={value}
        autoFocus={autoFocus}
        maxLength={COACH_QUESTION_MAX}
        rows={1}
        placeholder="Спроси о своём дне, привычках или целях"
        aria-label="Вопрос коучу"
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
        className="min-h-[3rem] flex-1 py-3"
      />

      <button
        type="button"
        onClick={send}
        disabled={!canSend}
        aria-label="Отправить вопрос"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-[0_6px_18px_-8px_var(--accent)] transition-[opacity,transform] duration-200 active:scale-[0.95] disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none"
      >
        <ArrowUp className="h-4.5 w-4.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
