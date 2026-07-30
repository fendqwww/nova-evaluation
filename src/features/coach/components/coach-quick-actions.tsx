"use client";

import { COACH_QUICK_ACTIONS } from "@/features/coach/lib/intents";
import type { CoachIntent } from "@/features/coach/lib/intents";

/**
 * The nine questions, as chips.
 *
 * Tapping one sends its label verbatim, so the history reads as a conversation
 * the user had rather than a log of buttons they pressed — and so a chip and a
 * typed question are the same code path all the way down to the composer.
 *
 * Horizontally scrollable rather than wrapped into a block: nine chips stacked
 * would push the composer off a phone screen, and the row keeps the section
 * feeling like suggestions instead of a menu that must be worked through.
 */
export function CoachQuickActions({
  onSelect,
  disabled,
}: {
  onSelect: (question: string, intent: CoachIntent) => void;
  disabled: boolean;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2 pb-0.5">
        {COACH_QUICK_ACTIONS.map((action) => (
          <button
            key={action.intent}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(action.label, action.intent)}
            className="shrink-0 rounded-full border border-border bg-surface-2 px-3.5 py-2 text-[0.8125rem] font-medium tracking-[-0.01em] text-foreground transition-colors duration-200 active:border-border-strong active:bg-surface-3 disabled:pointer-events-none disabled:opacity-40"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
