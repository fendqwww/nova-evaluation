"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

interface OptionCardProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * A big, single-column pill — the large-touch-target list pattern premium
 * onboarding flows use for single-choice questions (Typeform, Duolingo,
 * Headway). Selection is a filled brand-blue background, not a coloured
 * badge: this is the one place the accent appears on this screen.
 */
export function OptionCard({ label, selected, onSelect }: OptionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl border px-5 py-5 text-left transition-colors duration-200",
        selected
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-transparent text-foreground active:border-border-strong active:bg-fill-muted",
      )}
    >
      <span className="text-[1.125rem] font-semibold tracking-[-0.018em]">{label}</span>
      {selected && <Check className="h-5 w-5 shrink-0" strokeWidth={2.5} />}
    </motion.button>
  );
}
