"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, FileJson } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { formatBytes } from "@/features/settings/lib/format";
import { useDataTools } from "@/features/settings/hooks/use-data-tools";
import type { ExportBundle } from "@/features/settings/types";

/**
 * Build the export, then hand it over.
 *
 * Two ways out, and both are needed. A download is the obvious one, but this
 * app runs inside Telegram's in-app webview, where an anchor with `download`
 * sometimes opens the JSON in a viewer instead of saving it, and on iOS
 * sometimes does neither. Copying to the clipboard is the fallback that always
 * works, and offering it plainly is better than a download button that silently
 * does nothing on a third of devices.
 *
 * The file is built on demand rather than when the modal opens: it walks every
 * table the user owns, and opening a screen should not do that on the chance
 * the user might want it.
 */
export function ExportModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { runExport, isExporting, exportError } = useDataTools(false);
  const [bundle, setBundle] = useState<ExportBundle | null>(null);
  const [copied, setCopied] = useState(false);

  // The confirmation is a moment, not a state — it clears itself so the button
  // does not sit on "Скопировано" until the modal is closed.
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function build() {
    const result = await runExport();
    setBundle(result);
  }

  function download(file: ExportBundle) {
    const blob = new Blob([file.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.filename;
    anchor.click();

    // Revoked on the next tick rather than immediately: some webviews start
    // reading the blob after the click handler returns, and revoking too early
    // produces an empty file.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copy(file: ExportBundle) {
    try {
      await navigator.clipboard.writeText(file.json);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Экспорт данных</ModalTitle>
          <ModalDescription>
            Один JSON-файл со всем, что Nova хранит о твоём аккаунте.
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <Card elevation="inset">
            <ul className="flex flex-col gap-1.5 p-3.5 text-caption text-muted-foreground">
              <li>Профиль, цели, привычки, задачи</li>
              <li>Тренировки, питание, уход и переписка с коучем</li>
              <li>Фото не включаются — только их даты, подписи и размеры</li>
              <li>Обратный импорт файла пока не поддерживается</li>
            </ul>
          </Card>

          {!bundle && (
            <Button size="lg" onClick={build} disabled={isExporting}>
              {isExporting ? "Собираем…" : "Подготовить файл"}
            </Button>
          )}

          {exportError && (
            <p className="text-caption text-destructive">
              Не удалось собрать файл. Попробуй ещё раз.
            </p>
          )}

          {bundle && (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-input px-4 py-3">
                <FileJson className="h-4.5 w-4.5 shrink-0 text-accent" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-body text-foreground">{bundle.filename}</p>
                  <p className="text-caption text-muted-foreground">
                    {formatBytes(bundle.sizeBytes)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" size="lg" onClick={() => download(bundle)}>
                  <Download className="h-4 w-4" />
                  Скачать
                </Button>
                <Button
                  className="flex-1"
                  size="lg"
                  variant="secondary"
                  onClick={() => copy(bundle)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Скопировано" : "Копировать"}
                </Button>
              </div>

              <p className="text-caption text-subtle-foreground">
                Если скачивание не сработало внутри Telegram — скопируйте файл и
                вставьте его в любой текстовый редактор.
              </p>
            </>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
