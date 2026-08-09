"use client";

import { Minus, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { exerciseProgress } from "@/features/workouts/lib/stats";
import { formatVolume, formatWeight, repsWord } from "@/features/workouts/lib/format";
import type { WorkoutExerciseItem, WorkoutSessionItem } from "@/features/workouts/types";

/**
 * Progress, which for training means one movement tracked over time.
 *
 * Every number here is read off the logged sets — there is no stored personal
 * record, because a record column would go stale the moment a mistyped set was
 * corrected. The sparkline is the top set of each session, which is the series
 * people actually mean when they say "я прогрессирую".
 *
 * Exercises with a single session show the line's endpoints rather than a
 * trend: two points are a line, one point is not, and drawing a flat stroke
 * through it would imply a plateau that has not been observed.
 */
export function ExerciseProgressList({
  exercises,
  sessions,
}: {
  exercises: WorkoutExerciseItem[];
  sessions: WorkoutSessionItem[];
}) {
  const rows = exercises
    .map((exercise) => ({ exercise, progress: exerciseProgress(exercise.id, sessions) }))
    .filter((row) => row.progress.points.length > 0);

  if (rows.length === 0) {
    return (
      <p className="text-caption text-subtle-foreground">
        Прогресс появится, когда в тренировке будут записаны подходы — по каждому
        упражнению отдельно.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ exercise, progress }) => {
        const last = progress.points.at(-1)!;
        const first = progress.points[0];

        /**
         * Pull-ups have no weight, and reporting them as "рекорд 0 кг" is not a
         * measurement — it is the absence of one, dressed up as a number. When
         * nothing has ever been loaded on this movement, the series that
         * carries the progress is reps, so that is what the row shows: the same
         * three facts, counted in the unit that actually moves.
         */
        const isBodyweight = progress.bestWeightKg === 0;
        const delta = isBodyweight ? last.reps - (first?.reps ?? 0) : progress.weightDeltaKg;
        const deltaLabel = isBodyweight
          ? `${Math.abs(delta)} ${repsWord(Math.abs(delta))}`
          : `${formatWeight(Math.abs(delta))} кг`;

        return (
          <div
            key={exercise.id}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface-inset p-3"
          >
            <div className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={cn(
                    "truncate text-caption font-semibold",
                    exercise.archivedAt === null ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {exercise.name}
                  {exercise.archivedAt !== null && " · убрано из плана"}
                </span>
                <span className="numeric text-[0.6875rem] text-subtle-foreground">
                  Последняя: {last.sets} ×{" "}
                  {Math.round(last.reps / Math.max(1, last.sets))}
                  {isBodyweight
                    ? ` · ${last.reps} ${repsWord(last.reps)}`
                    : ` · ${formatWeight(last.topWeightKg)} кг · ${formatVolume(last.volumeKg)}`}
                </span>
              </div>

              {progress.points.length > 1 && (
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold",
                    delta > 0
                      ? "bg-positive-muted text-positive"
                      : delta < 0
                        ? "bg-destructive-muted text-destructive"
                        : "bg-fill-muted text-subtle-foreground",
                  )}
                >
                  {delta > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : delta < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  <span className="numeric">
                    {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                    {deltaLabel}
                  </span>
                </span>
              )}
            </div>

            {progress.points.length > 1 && (
              <Sparkline
                values={progress.points.map((point) =>
                  isBodyweight ? point.reps : point.topWeightKg,
                )}
              />
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {isBodyweight ? (
                <Fact
                  label="Рекорд"
                  value={`${progress.bestReps} ${repsWord(progress.bestReps)}`}
                  highlight={last.reps > 0 && last.reps === Math.max(...progress.points.map((point) => point.reps)) && progress.points.length > 1}
                />
              ) : (
                <>
                  <Fact
                    label="Рекорд"
                    value={`${formatWeight(progress.bestWeightKg)} кг`}
                    highlight={progress.isRecordFresh}
                  />
                  <Fact
                    label="Лучший подход"
                    value={`${progress.bestReps} ${repsWord(progress.bestReps)}`}
                  />
                </>
              )}
              <Fact label="Тренировок" value={String(progress.points.length)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Fact({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[0.6875rem] text-subtle-foreground">{label}</span>
      <span
        className={cn(
          "numeric text-[0.6875rem] font-semibold",
          highlight ? "text-positive" : "text-foreground",
        )}
      >
        {value}
      </span>
      {highlight && <Trophy className="h-3 w-3 text-positive" />}
    </span>
  );
}

/**
 * One value per session, as a single stroke.
 *
 * Deliberately unlabelled and unscaled: the axis values are already spelled out
 * above and below it in words, and a 40px-tall chart with tick labels is a
 * chart nobody can read. It answers one question — is the line going up — which
 * is the only question this size can honestly answer.
 *
 * The caller picks the series, because the series that carries progress differs
 * per exercise: the top set for anything loaded, reps for bodyweight work.
 */
function Sparkline({ values }: { values: number[] }) {
  const width = 100;
  const height = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      // A flat series sits in the middle rather than pinned to the floor, which
      // would read as "dropped to zero".
      const y = height - ((value - min) / span) * (height - 3) - 1.5;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-6 w-full"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
