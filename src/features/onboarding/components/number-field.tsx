"use client";

import { Minus, Plus, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  unit: string;
  min: number;
  max: number;
  step?: number;
}

export function NumberField({
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
}: NumberFieldProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10">
      <div className="flex items-baseline gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (!Number.isNaN(parsed)) {
              onChange(clamp(parsed));
            }
          }}
          className="w-40 bg-transparent text-center text-6xl font-semibold tracking-tight text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-xl font-medium text-muted-foreground">{unit}</span>
      </div>

      <div className="flex items-center gap-4">
        <StepperButton
          icon={Minus}
          label="Уменьшить"
          onClick={() => onChange(clamp(value - step))}
        />
        <StepperButton
          icon={Plus}
          label="Увеличить"
          onClick={() => onChange(clamp(value + step))}
        />
      </div>
    </div>
  );
}

function StepperButton({
  icon: Icon,
  onClick,
  label,
}: {
  icon: LucideIcon;
  onClick: () => void;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      aria-label={label}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors duration-200 hover:bg-white/[0.06]"
    >
      <Icon className="h-5 w-5" />
    </motion.button>
  );
}
