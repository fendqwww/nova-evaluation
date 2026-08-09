"use client";

import { useEffect, useId } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/shared/lib/cn";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * The single deliberately-colourful element on the dashboard — like an Apple
 * Fitness ring. One hue, not a rainbow: the theme is one accent, and this is
 * where it gets to be seen at full strength.
 *
 * The stroke is a subtle gradient of that one hue (not a second colour) so the
 * ring reads as lit rather than painted, and a soft blurred duplicate sits
 * behind it as a glow — the same "one warm point of light" the empty state's
 * icon well uses, just brighter here because this is the screen's hero.
 */
export function CircularProgress({
  value,
  size = 160,
  strokeWidth = 12,
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

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-25 blur-xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 68%)" }}
      />
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-light)" />
            <stop offset="100%" stopColor="var(--accent)" />
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
