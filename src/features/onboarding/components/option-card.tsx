"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

interface OptionCardProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  /** Optional leading color swatch — used by the theme-selection step. */
  swatchColor?: string;
}

export function OptionCard({ label, selected, onSelect, swatchColor }: OptionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border px-5 py-4 text-left text-base font-medium transition-colors duration-200",
        selected
          ? "border-accent-border bg-accent-muted text-foreground"
          : "border-border bg-card text-foreground hover:bg-surface-2",
      )}
    >
      <span className="flex items-center gap-3">
        {swatchColor && (
          <span
            className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/15"
            style={{ backgroundColor: swatchColor }}
            aria-hidden
          />
        )}
        {label}
      </span>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
          selected ? "border-accent bg-accent" : "border-border",
        )}
      >
        {selected && <Check className="h-3.5 w-3.5 text-accent-foreground" />}
      </span>
    </motion.button>
  );
}
