"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

interface OptionCardProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
}

export function OptionCard({ label, selected, onSelect }: OptionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border px-5 py-4 text-left text-base font-medium transition-colors duration-200",
        selected
          ? "border-accent bg-accent/10 text-foreground"
          : "border-border bg-card text-foreground hover:bg-white/[0.06]",
      )}
    >
      {label}
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
