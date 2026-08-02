"use client";

import { Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

/**
 * A number with two thumbs on it.
 *
 * Reps and weight are adjusted far more often than they are typed — a set is
 * usually last set ± one plate — so the steppers are the primary control and
 * the field itself is still a real input for the times they are not. inputMode
 * "decimal" rather than type="number": the numeric keypad is the point, while
 * type="number" brings spinner arrows, silent locale parsing and a scroll wheel
 * that changes weights by accident.
 */
export function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  suffix,
  label,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  label: string;
  className?: string;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next * 100) / 100));

  return (
    <div className={cn("flex items-stretch gap-1", className)}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label={`${label}: меньше`}
        className="flex h-10 w-9 shrink-0 items-center justify-center rounded-l-xl border border-border bg-input text-muted-foreground transition-colors duration-200 active:bg-white/6 disabled:pointer-events-none disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </motion.button>

      <div className="relative min-w-0 flex-1">
        <input
          value={Number.isFinite(value) ? String(value).replace(".", ",") : ""}
          onChange={(event) => {
            const raw = event.target.value.replace(",", ".").replace(/[^\d.]/g, "");
            if (raw === "") return onChange(min);
            const parsed = Number.parseFloat(raw);
            if (Number.isFinite(parsed)) onChange(clamp(parsed));
          }}
          inputMode="decimal"
          aria-label={label}
          className={cn(
            "numeric h-10 w-full border-y border-border bg-input text-center text-body font-semibold text-foreground transition-colors duration-200 focus-visible:border-accent-border focus-visible:outline-none",
            suffix && "pr-6",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.6875rem] text-subtle-foreground">
            {suffix}
          </span>
        )}
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label={`${label}: больше`}
        className="flex h-10 w-9 shrink-0 items-center justify-center rounded-r-xl border border-border bg-input text-muted-foreground transition-colors duration-200 active:bg-white/6 disabled:pointer-events-none disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </motion.button>
    </div>
  );
}
