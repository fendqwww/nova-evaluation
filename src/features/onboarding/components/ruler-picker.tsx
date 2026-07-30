"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const TICK_GAP = 14;

interface RulerPickerProps {
  value: number;
  onChange: (value: number) => void;
  unit: string;
  min: number;
  max: number;
  step?: number;
  majorEvery?: number;
  /**
   * Shrinks the picker so several can stack in one scene: the value moves onto
   * a labelled row instead of being a full-screen hero number. Purely visual —
   * TICK_GAP and every scroll offset stay identical between the two sizes.
   */
  compact?: boolean;
  /** Names the measurement. Required in compact mode, where three rulers share a screen. */
  label?: string;
}

/**
 * The horizontal drag-scrub ruler used across health/fitness onboarding
 * (Apple Health, Rise, Headway) for age/height/weight — a named, established
 * pattern, not an invented widget. Scrubbing feels tactile in a way a plain
 * +/- stepper never does, which is the entire reason it replaces one here.
 *
 * Native scroll-snap drives touch/trackpad; a pointer-drag handler adds the
 * same interaction for desktop mice, which don't get click-drag scrolling
 * for free. Arrow keys keep it keyboard- and screen-reader operable.
 *
 * Two paths write the value: the user physically moving the track (drag or
 * native scroll, read back via onScroll) and the keyboard nudging it
 * directly. Every programmatic scrollLeft write we make ourselves — the
 * keyboard nudge, snapping back after a drag — sets `suppressCommit` first,
 * because the resulting native 'scroll' event fires asynchronously and
 * would otherwise re-derive a value from a scroll position that's already
 * stale by the time the event arrives, undoing the very update that caused
 * it.
 *
 * Deliberately no CSS scroll-snap: a snap point sits at an element's
 * *center*, half a tick away from the left-edge-based offsets the rest of
 * this component computes, so the browser's own snap correction would fire
 * after every one of our writes and fight them. Ticks are dense enough
 * (14px) that resting mid-tick during momentum coast is imperceptible, and
 * the value already tracks the nearest tick continuously as the user drags.
 */
export function RulerPicker({
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
  majorEvery = 10,
  compact = false,
  label,
}: RulerPickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const suppressCommit = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);
  // Guards the initial-position effect below so it fires exactly once ever,
  // not once per ResizeObserver tick — a layout with any sub-pixel jitter
  // (the big number's width changes with every digit) fires the observer
  // repeatedly, and re-running the position effect each time would snap
  // scrollLeft back to whatever `value` was at that render.
  const didInitScroll = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el || containerWidth === 0 || didInitScroll.current) return;
    didInitScroll.current = true;
    el.scrollLeft = ((value - min) / step) * TICK_GAP;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth]);

  function commitFromScrollLeft(scrollLeft: number) {
    const index = Math.round(scrollLeft / TICK_GAP);
    const next = Math.min(max, Math.max(min, min + index * step));
    if (next !== value) onChange(next);
  }

  // A scrollLeft write we make ourselves triggers an async 'scroll' event;
  // this suppresses commitFromScrollLeft for exactly that event before
  // letting the scroll handler run again.
  function writeScrollLeft(scrollLeft: number) {
    const el = trackRef.current;
    if (!el) return;
    suppressCommit.current = true;
    el.scrollLeft = scrollLeft;
    requestAnimationFrame(() => requestAnimationFrame(() => (suppressCommit.current = false)));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el) return;
    isDragging.current = true;
    dragStartX.current = event.clientX;
    dragStartScroll.current = el.scrollLeft;
    el.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return;
    const el = trackRef.current;
    if (!el) return;
    el.scrollLeft = dragStartScroll.current - (event.clientX - dragStartX.current);
    commitFromScrollLeft(el.scrollLeft);
  }

  function endDrag() {
    if (!isDragging.current) return;
    isDragging.current = false;
    const el = trackRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / TICK_GAP);
    writeScrollLeft(index * TICK_GAP);
  }

  function nudge(direction: 1 | -1) {
    const next = Math.min(max, Math.max(min, value + direction * step));
    onChange(next);
    writeScrollLeft(((next - min) / step) * TICK_GAP);
  }

  const tickCount = Math.round((max - min) / step) + 1;
  const majorStride = Math.round(majorEvery / step);

  const readout = (
    <div className="flex items-baseline gap-1.5">
      <motion.span
        key={value}
        initial={{ opacity: 0.5, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={
          compact
            ? "numeric text-[1.5rem] font-bold leading-none text-foreground"
            : "numeric text-metric text-foreground"
        }
      >
        {value}
      </motion.span>
      <span
        className={
          compact
            ? "text-[0.9375rem] font-medium text-muted-foreground"
            : "text-lg font-medium text-subtle-foreground"
        }
      >
        {unit}
      </span>
    </div>
  );

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-2"
          : "flex flex-1 flex-col items-center justify-center gap-10"
      }
    >
      {compact ? (
        <div className="flex items-baseline justify-between">
          <span className="text-lead text-lead-foreground">{label}</span>
          {readout}
        </div>
      ) : (
        readout
      )}

      <div className="relative w-full">
        <div
          className={
            compact
              ? "pointer-events-none absolute left-1/2 top-0 z-10 h-7 w-[2.5px] -translate-x-1/2 rounded-full bg-accent"
              : "pointer-events-none absolute left-1/2 top-0 z-10 h-9 w-[2.5px] -translate-x-1/2 rounded-full bg-accent"
          }
          aria-hidden
        />

        <div
          ref={trackRef}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label ? `${label}, ${unit}` : `Значение, ${unit}`}
          tabIndex={0}
          onScroll={(e) => {
            if (isDragging.current || suppressCommit.current) return;
            commitFromScrollLeft(e.currentTarget.scrollLeft);
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") nudge(-1);
            if (e.key === "ArrowRight") nudge(1);
          }}
          className={
            compact
              ? "flex h-8 touch-pan-x cursor-grab select-none overflow-x-scroll outline-none active:cursor-grabbing"
              : "flex h-10 touch-pan-x cursor-grab select-none overflow-x-scroll outline-none active:cursor-grabbing"
          }
          style={{
            paddingInline: containerWidth / 2,
            scrollbarWidth: "none",
            maskImage:
              "linear-gradient(90deg, transparent 0%, black 20%, black 80%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, black 20%, black 80%, transparent 100%)",
          }}
        >
          {Array.from({ length: tickCount }, (_, i) => i).map((i) => (
            <div
              key={i}
              className="flex shrink-0 items-end justify-center"
              style={{ width: TICK_GAP }}
            >
              <div
                className={
                  i % majorStride === 0
                    ? compact
                      ? "h-5 w-[1.5px] rounded-full bg-white/20"
                      : "h-7 w-[1.5px] rounded-full bg-white/20"
                    : compact
                      ? "h-2.5 w-px rounded-full bg-white/10"
                      : "h-3.5 w-px rounded-full bg-white/10"
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
