"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

interface SegmentedChoiceProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
}

/**
 * A single-row segmented control for a short, low-stakes choice.
 *
 * Gender used to occupy a whole scene of full-width OptionCards, which spent
 * one of the flow's most valuable screens on a three-way tap that vanished in
 * 220ms. Here it sits inside the "about you" scene next to the measurements it
 * belongs with. OptionCard is still the right control for the questions that
 * genuinely deserve a screen of their own (goal, occupation).
 */
export function SegmentedChoice<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedChoiceProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-lead text-lead-foreground">{label}</span>

      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-1.5 rounded-2xl border border-border p-1.5"
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <motion.button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-[0.9375rem] font-semibold tracking-[-0.012em] transition-colors duration-200",
                selected
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground active:bg-white/4",
              )}
            >
              {option.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
