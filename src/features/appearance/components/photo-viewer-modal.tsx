"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { Sparkles, Trash2 } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { areaLabel } from "@/features/appearance/lib/areas";
import { usePhotoImage } from "@/features/appearance/hooks/use-photo-image";
import { analyzeAppearancePhotoAction } from "@/features/appearance/server/analyze-appearance-photo.action";
import { AppearanceAnalysisCard } from "@/features/appearance/components/appearance-analysis-card";
import type { CarePhotoItem } from "@/features/appearance/types";

/**
 * One photo at full size.
 *
 * The bytes are fetched here rather than carried in from the gallery — see
 * usePhotoImage — so opening a photo is the first time it costs anything. The
 * thumbnail stands in while that lands, which makes the transition read as the
 * image sharpening rather than as a blank box.
 */
export function PhotoViewerModal({
  photo,
  today,
  open,
  onOpenChange,
  onDelete,
  onAnalyzed,
}: {
  photo: CarePhotoItem | null;
  today: CalendarDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (photoId: string) => Promise<unknown>;
  /** Refetch the section once an analysis has been written to the row. */
  onAnalyzed?: () => Promise<unknown> | void;
}) {
  const rawInitData = useRawInitData();
  const [confirming, setConfirming] = useState(false);
  // Written server-side (features/usage/lib/format.ts), because FREE's single
  // appearance analysis never comes back and every other tier's does — a
  // difference two numbers cannot express.
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const { imageData, isPending } = usePhotoImage(open && photo ? photo.id : null);

  const analyze = useMutation({
    mutationFn: () =>
      analyzeAppearancePhotoAction({
        rawInitData,
        imageData: imageData ?? photo!.thumbData,
        // Attaching it to the row is what makes the result outlive this modal.
        photoId: photo!.id,
        // The area this photo was filed under, which is also what it is a photo
        // of — so re-analysing an old physique shot reads it as a physique
        // rather than as a portrait with no face in it.
        area: photo!.area,
      }),
    onSuccess: (result) => {
      setLimitMessage(result.ok || result.reason !== "limit" ? null : result.message);
      // The photo now carries an analysis, so the section snapshot is stale.
      if (result.ok) void onAnalyzed?.();
    },
  });

  if (!photo) return null;

  // A stored analysis wins until this session produces a fresher one, so
  // reopening a photo shows its reading immediately instead of an empty button.
  const analysis = analyze.data?.ok ? analyze.data.analysis : photo.analysis;
  const analyzeErrorMessage = analyze.data && !analyze.data.ok && analyze.data.reason === "error"
    ? analyze.data.message
    : null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[92dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{areaLabel(photo.area)}</ModalTitle>
          <ModalDescription>{formatDay(photo.day, today)}</ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface-inset">
            <Image
              src={imageData ?? photo.thumbData}
              alt={`${areaLabel(photo.area)}, ${formatDay(photo.day, today)}`}
              width={photo.width}
              height={photo.height}
              unoptimized
              className="h-auto w-full object-contain"
            />
            {isPending && (
              <span className="absolute inset-x-0 bottom-0 flex justify-center pb-2">
                <Skeleton className="h-1 w-16" />
              </span>
            )}
          </div>

          {photo.note && <p className="text-caption text-muted-foreground">{photo.note}</p>}

          <Button
            variant="secondary"
            className="w-full"
            disabled={analyze.isPending || isPending}
            onClick={() => analyze.mutate()}
          >
            <Sparkles className="h-4 w-4" />
            {analyze.isPending
              ? "Анализируем…"
              : analysis
                ? "Проанализировать заново"
                : "Анализ фото"}
          </Button>

          {limitMessage && (
            <Card elevation="inset">
              <p className="p-3.5 text-caption text-muted-foreground">
                {limitMessage} Тарифы — «Настройки» → «Подписка».
              </p>
            </Card>
          )}

          {analyzeErrorMessage && (
            <p className="text-caption text-destructive">{analyzeErrorMessage}</p>
          )}

          {analysis && <AppearanceAnalysisCard analysis={analysis} />}

          {confirming ? (
            <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive-muted p-3">
              <p className="text-caption text-foreground">
                Удалить фото? Это нельзя отменить.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setConfirming(false)}
                >
                  Отмена
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    void onDelete(photo.id).then(() => onOpenChange(false));
                  }}
                >
                  Удалить
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="h-4 w-4" />
              Удалить фото
            </Button>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
