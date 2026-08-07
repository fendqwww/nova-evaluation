"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, Flame, History, Plus, Sparkles, Target, Trophy, Archive } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { buildHistory, type CareEvent, type CareEventKind } from "@/features/appearance/lib/history";
import type {
  CareGoalItem,
  CarePhotoItem,
  CareRoutineItem,
} from "@/features/appearance/types";

/** How many entries show before the "показать ещё" step. */
const PAGE_SIZE = 20;

/**
 * История изменений — the section's timeline, newest first.
 *
 * Nothing here was recorded as it happened: every entry is rebuilt from the
 * photos, goals, routines and logs that already exist (see buildHistory). The
 * practical consequence is that a user who did not open the app for a month
 * still gets a complete history rather than a gap.
 */
export function CareHistoryList({
  routines,
  photos,
  goals,
  today,
  windowStart,
  onOpenPhoto,
}: {
  routines: CareRoutineItem[];
  photos: CarePhotoItem[];
  goals: CareGoalItem[];
  today: CalendarDay;
  windowStart: CalendarDay;
  onOpenPhoto: (photo: CarePhotoItem) => void;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);

  const events = buildHistory(routines, photos, goals, today, windowStart);

  if (events.length === 0) {
    return (
      <EmptyState
        className="py-8"
        icon={<History className="h-5 w-5" />}
        title="История пока пуста"
        description="Здесь останутся фото, достигнутые цели и серии выполнения."
      />
    );
  }

  const visible = events.slice(0, limit);

  return (
    <div className="flex flex-col gap-2.5">
      {visible.map((event) => (
        <Card key={event.id}>
          <button
            type="button"
            disabled={event.photo === null}
            onClick={() => event.photo && onOpenPhoto(event.photo)}
            className="flex w-full items-center gap-3 p-3.5 text-left disabled:cursor-default"
          >
            {event.photo ? (
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[0.625rem] border border-border">
                <Image
                  src={event.photo.thumbData}
                  alt=""
                  fill
                  unoptimized
                  sizes="44px"
                  className="object-cover"
                />
              </span>
            ) : (
              <IconChip tone={toneOf(event.kind)} size="md">
                <EventIcon kind={event.kind} />
              </IconChip>
            )}

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-body font-medium text-foreground">
                {event.title}
              </span>
              <span className="truncate text-caption text-muted-foreground">
                {formatDay(event.day, today)}
                {event.detail && ` · ${event.detail}`}
              </span>
            </span>
          </button>
        </Card>
      ))}

      {events.length > limit && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => setLimit((value) => value + PAGE_SIZE)}
        >
          <Plus className="h-4 w-4" />
          Показать ещё
        </Button>
      )}
    </div>
  );
}

function EventIcon({ kind }: { kind: CareEventKind }) {
  switch (kind) {
    case "goal_completed":
      return <Trophy className="h-4 w-4" />;
    case "goal_created":
      return <Target className="h-4 w-4" />;
    case "streak":
      return <Flame className="h-4 w-4" />;
    case "photo":
      return <Camera className="h-4 w-4" />;
    case "routine_archived":
      return <Archive className="h-4 w-4" />;
    case "routine_created":
      return <Sparkles className="h-4 w-4" />;
  }
}

function toneOf(kind: CareEvent["kind"]): "score" | "goal" | "habit" | "neutral" {
  switch (kind) {
    case "goal_completed":
      return "score";
    case "goal_created":
      return "goal";
    case "streak":
      return "habit";
    default:
      return "neutral";
  }
}
