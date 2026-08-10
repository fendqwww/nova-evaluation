"use client";

import { useEffect, useId } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/shared/lib/cn";

/**
 * The ring, in four states.
 *
 * `accent` is the original and stays the default: the hero ring on the
 * dashboard, one hue at full strength, lit rather than painted. The other three
 * exist because the Health Overview shows four rings at once, and four
 * *category* colours would turn the screen into a rainbow — which the whole
 * palette in globals.css is written to avoid. So colour here carries **state,
 * not identity**: a healthy score is the brand hue, a score that wants
 * attention is warning, a score in trouble is destructive, and a score with
 * nothing measured is a bare track. Four rings on a good day read as one brand
 * colour; a red ring means something.
 */
export type RingTone = "accent" | "warning" | "destructive" | "muted";

const TONE_VAR: Record<RingTone, { from: string; to: string }> = {
  accent: { from: "var(--color-accent-light)", to: "var(--accent)" },
  warning: { from: "var(--warning)", to: "var(--warning)" },
  destructive: { from: "var(--destructive)", to: "var(--destructive)" },
  muted: { from: "var(--track)", to: "var(--track)" },
};

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: RingTone;
  /**
   * The soft bloom behind the ring. On by default because the dashboard hero
   * is what it was built for; off for the small rings, where four glows at
   * 76px would be fog rather than light.
   */
  glow?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function CircularProgress({
  value,
  size = 160,
  strokeWidth = 12,
  tone = "accent",
  glow = true,
  className,
  children,
}: CircularProgressProps) {
  const gradientId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useMotionValue(0);
  const strokeDashoffset = useTransform(
    progress,
    (v) => circumference - (Math.min(100, Math.max(0, v)) / 100) * circumference,
  );

  useEffect(() => {
    const controls = animate(progress, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- progress is a stable MotionValue
  }, [value]);

  const stops = TONE_VAR[tone];

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {glow && tone !== "muted" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-25 blur-xl"
          style={{ background: `radial-gradient(circle, ${stops.to}, transparent 68%)` }}
        />
      )}
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stops.from} />
            <stop offset="100%" stopColor={stops.to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-track"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          style={{ strokeDasharray: circumference, strokeDashoffset }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}

/** The band a health score falls into. One mapping, so no screen invents its own. */
export function ringToneForScore(score: number | null): RingTone {
  if (score === null) return "muted";
  if (score >= 75) return "accent";
  if (score >= 50) return "warning";
  return "destructive";
}
