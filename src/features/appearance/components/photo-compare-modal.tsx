"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { cn } from "@/shared/lib/cn";
import { formatDay, pluralizeDaysApart } from "@/features/appearance/lib/format";
import { areaLabel } from "@/features/appearance/lib/areas";
import { usePhotoImage } from "@/features/appearance/hooks/use-photo-image";
import { diffDays, type CalendarDay } from "@/shared/lib/calendar-day";
import type { CareArea, CarePhotoItem } from "@/features/appearance/types";

/**
 * До / После — two photos of the same area, side by side.
 *
 * The area is fixed for the whole comparison and both pickers are drawn from
 * it, because comparing skin against a beard shot would be a picture of two
 * different things presented as change over time. That is the one thing a
 * progress comparison must not be able to do.
 *
 * It opens on the oldest and the newest shot — the widest true comparison
 * available — and every other photo of that area is one tap away in either
 * strip.
 */
export function PhotoCompareModal({
  photos,
  area,
  today,
  open,
  onOpenChange,
}: {
  photos: CarePhotoItem[];
  area: CareArea | null;
  today: CalendarDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const inArea = area
    ? [...photos]
        .filter((photo) => photo.area === area)
        .sort((a, b) => a.day.localeCompare(b.day) || a.createdAt.localeCompare(b.createdAt))
    : [];

  const [beforeId, setBeforeId] = useState<string | null>(inArea[0]?.id ?? null);
  const [afterId, setAfterId] = useState<string | null>(
    inArea[inArea.length - 1]?.id ?? null,
  );

  const before = inArea.find((photo) => photo.id === beforeId) ?? inArea[0] ?? null;
  const after =
    inArea.find((photo) => photo.id === afterId) ?? inArea[inArea.length - 1] ?? null;

  if (!area || !before || !after) return null;

  const daysApart = Math.abs(diffDays(before.day, after.day));

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[92dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>До / После — {areaLabel(area).toLocaleLowerCase("ru")}</ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <ComparePane label="До" photo={before} today={today} />
            <ComparePane label="После" photo={after} today={today} />
          </div>

          {daysApart > 0 && (
            <p className="text-center text-caption text-muted-foreground">
              Разница — {pluralizeDaysApart(daysApart)}
            </p>
          )}

          <PhotoStrip
            label="Выберите «до»"
            photos={inArea}
            selectedId={before.id}
            today={today}
            onSelect={setBeforeId}
          />
          <PhotoStrip
            label="Выберите «после»"
            photos={inArea}
            selectedId={after.id}
            today={today}
            onSelect={setAfterId}
          />
        </div>
      </ModalContent>
    </Modal>
  );
}

function ComparePane({
  label,
  photo,
  today,
}: {
  label: string;
  photo: CarePhotoItem;
  today: CalendarDay;
}) {
  const { imageData } = usePhotoImage(photo.id);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption font-medium text-subtle-foreground">{label}</span>
      <div className="relative aspect-3/4 overflow-hidden rounded-xl border border-border bg-black/30">
        <Image
          src={imageData ?? photo.thumbData}
          alt={`${label}: ${formatDay(photo.day, today)}`}
          fill
          unoptimized
          sizes="50vw"
          className="object-cover"
        />
      </div>
      <span className="text-caption text-muted-foreground">{formatDay(photo.day, today)}</span>
    </div>
  );
}

function PhotoStrip({
  label,
  photos,
  selectedId,
  today,
  onSelect,
}: {
  label: string;
  photos: CarePhotoItem[];
  selectedId: string;
  today: CalendarDay;
  onSelect: (photoId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption text-muted-foreground">{label}</span>
      <div className="-mx-6 flex gap-1.5 overflow-x-auto px-6 pb-1">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => onSelect(photo.id)}
            aria-pressed={photo.id === selectedId}
            aria-label={formatDay(photo.day, today)}
            className={cn(
              "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition-colors duration-200",
              photo.id === selectedId ? "border-accent" : "border-border",
            )}
          >
            <Image
              src={photo.thumbData}
              alt=""
              fill
              unoptimized
              sizes="56px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
