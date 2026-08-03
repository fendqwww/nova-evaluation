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
import type { CarePhotoItem } from "@/features/appearance/types";

const ANALYSIS_SECTIONS = [
  { key: "strengths", label: "Сильные стороны" },
  { key: "weaknesses", label: "Точки роста" },
  { key: "recommendations", label: "Рекомендации" },
  { key: "care", label: "Уход" },
  { key: "style", label: "Стиль" },
] as const;

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
}: {
  photo: CarePhotoItem | null;
  today: CalendarDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (photoId: string) => Promise<unknown>;
}) {
  const rawInitData = useRawInitData();
  const [confirming, setConfirming] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ used: number; limit: number } | null>(null);
  const { imageData, isPending } = usePhotoImage(open && photo ? photo.id : null);

  const analyze = useMutation({
    mutationFn: () =>
      analyzeAppearancePhotoAction({ rawInitData, imageData: imageData ?? photo!.thumbData }),
    onSuccess: (result) => {
      setLimitInfo(result.ok || result.reason !== "limit" ? null : { used: result.used, limit: result.limit });
    },
  });

  if (!photo) return null;

  const analysis = analyze.data?.ok ? analyze.data.analysis : null;
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
          <div className="relative overflow-hidden rounded-xl border border-border bg-black/30">
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

          {!analysis && (
            <Button
              variant="secondary"
              className="w-full"
              disabled={analyze.isPending || isPending}
              onClick={() => analyze.mutate()}
            >
              <Sparkles className="h-4 w-4" />
              {analyze.isPending ? "Анализируем..." : "Анализ фото"}
            </Button>
          )}

          {limitInfo && (
            <Card elevation="inset">
              <p className="p-3.5 text-caption text-muted-foreground">
                Бесплатные анализы закончились ({limitInfo.used} из {limitInfo.limit}). Оформите
                NOVA PLUS, чтобы снять ограничение — раздел «Настройки» → «Подписка».
              </p>
            </Card>
          )}

          {analyzeErrorMessage && (
            <p className="text-caption text-destructive">{analyzeErrorMessage}</p>
          )}

          {analysis && (
            <Card elevation="accent">
              <div className="flex flex-col gap-3 p-3.5">
                <div className="flex items-center gap-2 text-accent">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-caption font-medium">
                    Уверенность анализа — {Math.round(analysis.confidence * 100)}%
                  </span>
                </div>

                {!analysis.isAnalyzable && (
                  <p className="text-caption text-muted-foreground">
                    На фото не получилось достаточно чётко разглядеть лицо или тело — попробуйте
                    более освещённый и чёткий снимок.
                  </p>
                )}

                {ANALYSIS_SECTIONS.map(({ key, label }) => {
                  const items = analysis[key];
                  if (items.length === 0) return null;

                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <p className="text-caption font-medium text-foreground">{label}</p>
                      <ul className="flex flex-col gap-1">
                        {items.map((item) => (
                          <li key={item} className="text-caption text-muted-foreground">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

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
