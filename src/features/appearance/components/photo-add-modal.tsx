"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { ImagePlus } from "lucide-react";
import Image from "next/image";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import type { AppearanceAnalysis } from "@/ai/types";
import { analyzeAppearancePhotoAction } from "@/features/appearance/server/analyze-appearance-photo.action";
import { AppearanceAnalysisCard } from "@/features/appearance/components/appearance-analysis-card";
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
  /** Returns the new row's id, which the analysis is then attached to. */
  onCreate: (draft: PhotoDraft) => Promise<{ photoId: string }>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const rawInitData = useRawInitData();

  const [area, setArea] = useState<CareArea>(defaultArea);
  const [note, setNote] = useState("");
  const [prepared, setPrepared] = useState<PreparedPhoto | null>(null);
  const [analyzeAfterSave, setAnalyzeAfterSave] = useState(true);
  const [analysis, setAnalysis] = useState<AppearanceAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const prepare = useMutation({
    mutationFn: (file: File) => preparePhoto(file),
    onSuccess: setPrepared,
  });

  /**
   * Save, then analyse the row that was just written.
   *
   * In that order, and attached to the new photo's id, so the reading survives
   * this modal — the analysis is charged against the daily AI budget, and
   * throwing it away on close was the whole reason it was invisible before.
   * A failed analysis never fails the save: the photo is already stored, and
   * the message says so rather than implying the photo was lost.
   */
  const save = useMutation({
    mutationFn: async () => {
      if (!prepared) throw new Error("NO_PHOTO");
      const created = await onCreate({
        ...prepared,
        area,
        day,
        note: note.trim() === "" ? null : note,
      });

      if (!analyzeAfterSave) return null;

      const result = await analyzeAppearancePhotoAction({
        rawInitData,
        imageData: prepared.imageData,
        photoId: created.photoId,
      });

      if (result.ok) return result.analysis;
      // The photo is already saved either way — that is the sentence's first
      // half, and it matters more than the reason the analysis did not run.
      setAnalysisError(
        result.reason === "limit"
          ? `Фото сохранено. ${result.message}`
          : `Фото сохранено, но анализ не удался. ${result.message}`,
      );
      return null;
    },
    onSuccess: (result) => {
      // Analysed photos keep the modal open on their result; a plain save has
      // nothing more to show and closes the way it always did.
      if (result) setAnalysis(result);
      else if (!analysisError) onOpenChange(false);
    },
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
                  {prepare.isPending ? "Обрабатываем…" : "Выбрать или снять фото"}
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

          <label className="flex items-start justify-between gap-3 rounded-xl border border-border bg-black/20 p-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-caption font-medium text-foreground">
                Разобрать фото через AI
              </span>
              <span className="text-caption text-subtle-foreground">
                Черты лица, состояние кожи и волос по зонам, рекомендации по уходу и
                стилю.
              </span>
            </span>
            <Switch
              checked={analyzeAfterSave}
              onCheckedChange={setAnalyzeAfterSave}
              aria-label="Разобрать фото через AI"
            />
          </label>

          <p className="text-caption text-subtle-foreground">
            {analyzeAfterSave
              ? "Фото хранится в твоём аккаунте. Для разбора оно один раз отправляется в AI и там не сохраняется."
              : "Фото хранится только в твоём аккаунте и никуда не отправляется."}
          </p>

          {save.isError && (
            <p className="text-caption text-destructive">
              Не удалось сохранить. Попробуй ещё раз.
            </p>
          )}

          {analysisError && <p className="text-caption text-warning">{analysisError}</p>}

          {analysis && <AppearanceAnalysisCard analysis={analysis} />}

          <Button
            className="w-full"
            size="lg"
            disabled={prepared === null || save.isPending}
            onClick={() => (analysis || analysisError ? onOpenChange(false) : save.mutate())}
          >
            {save.isPending
              ? analyzeAfterSave
                ? "Сохраняем и разбираем…"
                : "Сохраняем…"
              : analysis || analysisError
                ? "Готово"
                : "Сохранить фото"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
