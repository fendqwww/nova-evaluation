"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { areaLabel } from "@/features/appearance/lib/areas";
import { usePhotoImage } from "@/features/appearance/hooks/use-photo-image";
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
}: {
  photo: CarePhotoItem | null;
  today: CalendarDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (photoId: string) => Promise<unknown>;
}) {
  const [confirming, setConfirming] = useState(false);
  const { imageData, isPending } = usePhotoImage(open && photo ? photo.id : null);

  if (!photo) return null;

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
