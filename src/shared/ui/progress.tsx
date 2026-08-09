import { cn } from "@/shared/lib/cn";

const SIZE_CLASS = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2.5",
} as const;

export interface ProgressProps {
  /** 0–1. Above 1 is clamped for the bar; the caller's own label is free to say "112%". */
  value: number;
  /**
   * The fill. A class rather than a tone enum on purpose: every section already
   * owns a state-to-colour mapper (nutrition/lib/tone, workouts/lib/tone,
   * goals/lib/tone) where the bands genuinely differ — over 100% is a
   * callout-worthy state for calories and a meaningless one for a habit. A
   * second vocabulary here would be one more thing to keep in sync.
   */
  fillClass?: string;
  size?: keyof typeof SIZE_CLASS;
  /** Announced to assistive tech in place of the bare percentage. */
  label?: string;
  className?: string;
}

/**
 * A linear progress bar.
 *
 * The track used to be `bg-white/[0.06]` written out at every call site — a
 * colour with no light mode and no owner, so two bars on the same screen could
 * drift apart and nobody would see it. The track token, the clamp, the ARIA
 * role and the transition now live in one place; the fill stays the caller's.
 *
 * Width animates on the app's own `duration-base`/`ease-enter` pair, so a bar
 * growing after a logged meal reads as the number changing rather than as the
 * screen re-rendering under it.
 */
export function Progress({
  value,
  fillClass = "bg-accent",
  size = "md",
  label,
  className,
}: ProgressProps) {
  const ratio = Math.max(0, Math.min(1, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      aria-label={label}
      className={cn(
        "w-full overflow-hidden rounded-full bg-track",
        SIZE_CLASS[size],
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-[--duration-base] ease-[--ease-enter]",
          fillClass,
        )}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
