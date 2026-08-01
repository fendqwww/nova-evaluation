"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import Image from "next/image";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { AREA_OPTIONS } from "@/features/appearance/lib/icons";
import { isAreaOffered } from "@/features/appearance/lib/areas";
import { preparePhoto, type PreparedPhoto } from "@/features/appearance/lib/image";
import { PHOTO_NOTE_MAX, type PhotoDraft } from "@/features/appearance/schemas";
import type { CareArea } from "@/features/appearance/types";

/**
 * Taking or picking one progress photo.
 *
 * `capture="environment"` on a plain file input rather than a camera API: this
 * runs inside Telegram's webview, where getUserMedia is unreliable and the
 * native picker is what users expect anyway — it offers both the camera and the
 * camera roll, which is exactly the choice a progress photo needs.
 *
 * The heavy work happens the moment a file is picked, not on save: decoding and
 * re-encoding a 6 MB phone photo takes a beat, and doing it behind a visible
 * "Обрабатываем" beats freezing the save button later. What reaches the action
 * is already bounded, which is the only reason a data: URI in a row is
 * defensible at all.
 */
export function PhotoAddModal({
  day,
  defaultArea,
  gender,
  open,
  onOpenChange,
  onCreate,
}: {
  day: CalendarDay;
  defaultArea: CareArea;
  gender: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: PhotoDraft) => Promise<unknown>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [area, setArea] = useState<CareArea>(defaultArea);
  const [note, setNote] = useState("");
  const [prepared, setPrepared] = useState<PreparedPhoto | null>(null);

  const prepare = useMutation({
    mutationFn: (file: File) => preparePhoto(file),
    onSuccess: setPrepared,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!prepared) throw new Error("NO_PHOTO");
      return onCreate({ ...prepared, area, day, note: note.trim() === "" ? null : note });
    },
    onSuccess: () => onOpenChange(false),
  });

  const areaOptions = AREA_OPTIONS.filter(
    (option) => isAreaOffered(option.id, gender) || option.id === area,
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Фото прогресса</ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) prepare.mutate(file);
              // Reset so picking the same file twice still fires a change.
              event.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border-strong bg-black/20 transition-colors duration-200 active:border-accent"
          >
            {prepared ? (
              <Image
                src={prepared.thumbData}
                alt="Выбранное фото"
                width={prepared.width}
                height={prepared.height}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-2 text-subtle-foreground">
                <ImagePlus className="h-6 w-6" />
                <span className="text-caption">
                  {prepare.isPending ? "Обрабатываем..." : "Выбрать или снять фото"}
                </span>
              </span>
            )}
          </button>

          {prepare.isError && (
            <p className="text-caption text-destructive">
              {prepare.error instanceof Error
                ? prepare.error.message
                : "Не удалось обработать фото."}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground">Что на фото</span>
            <div className="grid grid-cols-4 gap-1.5">
              {areaOptions.map((option) => {
                const Icon = option.icon;
                const selected = option.id === area;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setArea(option.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-1 py-2.5 text-[0.6875rem] font-medium transition-colors duration-200",
                      selected
                        ? "border-accent-border bg-accent-muted text-accent"
                        : "border-border text-subtle-foreground active:border-border-strong",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="max-w-full truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            value={note}
            maxLength={PHOTO_NOTE_MAX}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Заметка — необязательно"
            aria-label="Заметка к фото"
          />

          <p className="text-caption text-subtle-foreground">
            Фото хранится только в вашем аккаунте и никуда не отправляется.
          </p>

          {save.isError && (
            <p className="text-caption text-destructive">
              Не удалось сохранить. Попробуйте ещё раз.
            </p>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={prepared === null || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Сохраняем..." : "Сохранить фото"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
