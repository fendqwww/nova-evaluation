"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

interface ThemeCardProps {
  label: string;
  /** The theme's one hue — previews exactly what --accent becomes. */
  swatch: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * A plain colour dot, not an emoji sticker or a per-card gradient wash —
 * the way a system accent-colour picker previews an option (iOS Settings,
 * macOS). Every tile has identical chrome; only the dot's fill changes,
 * which is the whole point: a theme is one hue, not a different mood.
 */
export function ThemeCard({ label, swatch, selected, onSelect }: ThemeCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.95 }}
      aria-pressed={selected}
      className="flex flex-col items-center gap-2.5 rounded-xl py-3.5"
    >
      <span className="relative flex h-11 w-11 items-center justify-center">
        <span
          className="h-full w-full rounded-full ring-1 ring-inset ring-white/15"
          style={{ backgroundColor: swatch }}
          aria-hidden
        />
        {selected && (
          <motion.span
            layoutId="theme-selected-ring"
            className="absolute -inset-1 rounded-full border-2"
            style={{ borderColor: swatch }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          />
        )}
        {selected && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/25">
            <Check className="h-4 w-4 text-white" strokeWidth={2.75} />
          </span>
        )}
      </span>
      <span
        className={cn(
          "text-[0.75rem] font-medium tracking-[-0.006em] transition-colors duration-200",
          selected ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}
