"use client";

import { useEffect, useRef, useState } from "react";

// Picking a card visibly confirms the choice, then advances on its own —
// one tap instead of tap-to-select-then-tap-Continue.
const ADVANCE_DELAY_MS = 220;

/**
 * Selection-step behaviour shared by the goal/theme/gender/occupation steps.
 *
 * Only a real tap advances. A value restored from an existing profile just
 * renders as pre-selected, so re-entering onboarding never races past a step
 * the user never answered this time round.
 */
export function useAdvanceOnSelect<T>(
  initial: T | undefined,
  advance: (value: T) => void,
) {
  const [selected, setSelected] = useState(initial);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function select(value: T) {
    setSelected(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => advance(value), ADVANCE_DELAY_MS);
  }

  return { selected, select };
}
