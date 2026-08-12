"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { formatClock } from "@/features/workouts/lib/format";

/**
 * The countdown between sets.
 *
 * It counts from a wall-clock deadline rather than by decrementing on each
 * tick: a phone that sleeps mid-set stops firing intervals, and a timer that
 * quietly pauses when the screen goes dark is worse than no timer at all. The
 * interval only decides how often the remaining time is *read*, never what it
 * is.
 *
 * There is deliberately no sound and no vibration. Delivering either reliably
 * inside a Telegram web view means feature-detection branches that fail
 * silently on some clients, and a rest timer that beeps on one phone and not
 * another is a promise the app cannot keep. The bar turning green is the
 * signal, and the sheet is on screen while it runs.
 */
export function RestTimer({
  seconds,
  onDismiss,
}: {
  seconds: number;
  onDismiss: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [isRunning, setRunning] = useState(true);
  // Seeded on the first tick rather than at construction: reading the clock
  // during render is impure, and the effect below runs before the first frame
  // the user could see anyway.
  const deadline = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      deadline.current ??= Date.now() + seconds * 1000;
      const left = Math.max(0, (deadline.current - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) setRunning(false);
    };

    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [isRunning, seconds]);

  function restart() {
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setRunning(true);
  }

  function toggle() {
    if (isRunning) {
      setRunning(false);
      return;
    }
    deadline.current = Date.now() + remaining * 1000;
    setRunning(true);
  }

  const isDone = remaining <= 0;
  const ratio = seconds === 0 ? 1 : 1 - remaining / seconds;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        className="flex flex-col gap-2 rounded-xl border border-border surface-raised-2 p-3 shadow-card"
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "numeric text-metric-lg font-bold leading-none tracking-[-0.04em]",
              isDone ? "text-positive" : "text-foreground",
            )}
          >
            {formatClock(remaining)}
          </span>

          <span className="min-w-0 flex-1 text-caption text-muted-foreground">
            {isDone ? "Отдых закончен — следующий подход" : "Отдых между подходами"}
          </span>

          <div className="flex shrink-0 items-center gap-1">
            <TimerButton label={isRunning ? "Пауза" : "Продолжить"} onClick={toggle}>
              {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </TimerButton>
            <TimerButton label="Заново" onClick={restart}>
              <RotateCcw className="h-3.5 w-3.5" />
            </TimerButton>
            <TimerButton label="Закрыть таймер" onClick={onDismiss}>
              <X className="h-3.5 w-3.5" />
            </TimerButton>
          </div>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-fill-muted">
          <motion.div
            className={cn("h-full rounded-full", isDone ? "bg-positive" : "bg-accent")}
            initial={false}
            animate={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
            transition={{ duration: 0.2, ease: "linear" }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function TimerButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors duration-200 active:bg-fill-muted active:text-foreground"
    >
      {children}
    </button>
  );
}
