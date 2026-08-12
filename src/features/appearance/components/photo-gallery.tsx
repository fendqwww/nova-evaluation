"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, GitCompare, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/cn";
import { formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { areaLabel } from "@/features/appearance/lib/areas";
import { comparableAreas } from "@/features/appearance/lib/history";
import type { CareArea, CarePhotoItem } from "@/features/appearance/types";

/**
 * The photo history, newest first, grouped by the month it was taken in.
 *
 * Grid cells render `thumbData` and nothing else — the full image is a separate
 * round trip made only when a photo is opened (see usePhotoImage), which is
 * what keeps a year of progress photos from being a year of megabytes on every
 * visit to this tab.
 */
export function PhotoGallery({
  photos,
  today,
  onAdd,
  onOpen,
  onCompare,
}: {
  photos: CarePhotoItem[];
  today: CalendarDay;
  onAdd: () => void;
  onOpen: (photo: CarePhotoItem) => void;
  onCompare: (area: CareArea) => void;
}) {
  const [area, setArea] = useState<CareArea | "all">("all");

  const presentAreas = [...new Set(photos.map((photo) => photo.area))];
  const visible = area === "all" ? photos : photos.filter((photo) => photo.area === area);
  const canCompare = comparableAreas(photos);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-2">
        <EmptyState
          icon={<Camera className="h-5 w-5" />}
          title="Сделай первый снимок"
          description="Снимок раз в неделю при одном и том же свете — через месяц разницу будет видно."
          action={
            <Button size="lg" onClick={onAdd}>
              Добавить фото
            </Button>
          }
        />
      </div>
    );
  }

  const groups = groupByMonth(visible);

  return (
    <div className="flex flex-col gap-3">
      {presentAreas.length > 1 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
          <FilterChip label="Все" active={area === "all"} onClick={() => setArea("all")} />
          {presentAreas.map((option) => (
            <FilterChip
              key={option}
              label={areaLabel(option)}
              active={area === option}
              onClick={() => setArea(option)}
            />
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onAdd}>
          <Camera className="h-4 w-4" />
          Добавить
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={canCompare.length === 0}
          onClick={() => onCompare(area !== "all" && canCompare.includes(area) ? area : canCompare[0])}
        >
          <GitCompare className="h-4 w-4" />
          До / После
        </Button>
      </div>

      {canCompare.length === 0 && (
        <p className="text-caption text-subtle-foreground">
          Для сравнения нужно хотя бы два фото одной зоны.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <p className="text-caption font-medium text-subtle-foreground">{group.label}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {group.photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onOpen(photo)}
                className="relative aspect-square overflow-hidden rounded-lg border border-border transition-opacity duration-200 active:opacity-80"
              >
                <Image
                  src={photo.thumbData}
                  alt={`${areaLabel(photo.area)}, ${formatDay(photo.day, today)}`}
                  fill
                  unoptimized
                  sizes="33vw"
                  className="object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3 text-left text-nano font-medium text-white">
                  {photo.day.slice(-2).replace(/^0/, "")}.{photo.day.slice(5, 7)}
                </span>
                {/* Which photos already carry an AI reading. Without it, the
                    only way to find out is to open each one in turn. */}
                {photo.analysis && (
                  <span
                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface-inset backdrop-blur-sm"
                    title="Фото проанализировано"
                  >
                    <Sparkles className="h-3 w-3 text-accent-light" />
                    <span className="sr-only">Фото проанализировано</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-lg border px-3 py-1.5 text-caption font-medium transition-colors duration-200",
        active
          ? "border-accent-border bg-accent-muted text-accent"
          : "border-border text-subtle-foreground active:border-border-strong",
      )}
    >
      {label}
    </button>
  );
}

const MONTH_IN = [
  "январе",
  "феврале",
  "марте",
  "апреле",
  "мае",
  "июне",
  "июле",
  "августе",
  "сентябре",
  "октябре",
  "ноябре",
  "декабре",
];

/** Newest month first, matching the order the photos already arrive in. */
function groupByMonth(
  photos: CarePhotoItem[],
): { label: string; photos: CarePhotoItem[] }[] {
  const groups = new Map<string, CarePhotoItem[]>();

  for (const photo of photos) {
    const key = photo.day.slice(0, 7);
    const bucket = groups.get(key);
    if (bucket) bucket.push(photo);
    else groups.set(key, [photo]);
  }

  return [...groups.entries()].map(([key, items]) => {
    const [year, month] = key.split("-").map(Number);
    return { label: `В ${MONTH_IN[month - 1]} ${year}`, photos: items };
  });
}
