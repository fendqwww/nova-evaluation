"use client";

import { Camera, FileText, Sparkles } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Switch } from "@/shared/ui/switch";
import {
  SettingsGroup,
  SettingsRow,
  SoonBadge,
} from "@/features/settings/components/settings-group";
import type { AiSettings } from "@/features/settings/types";

/**
 * What the AI side of the app is allowed to do.
 *
 * The three switches are deliberately unequal and the UI does not pretend
 * otherwise:
 *
 *   - AI Coach is enforced. Off means getCoachOverview refuses to build an
 *     analysis and nothing is sent to Claude — the Coach screen shows why.
 *   - Ежедневный разбор is stored. The report is currently recomputed on every
 *     visit to the Coach screen rather than pushed, so this switch is what a
 *     future scheduled report will read.
 *   - AI Vision does not exist yet, and is marked "Скоро" rather than shipped
 *     as a live-looking toggle.
 *
 * Turning the coach off also greys out the other two: neither means anything
 * without it, and leaving them tappable would suggest an "off but still
 * reporting" state that cannot happen.
 */
export function AiGroup({
  ai,
  onChange,
}: {
  ai: AiSettings;
  onChange: (next: AiSettings) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SettingsGroup title="AI">
        <SettingsRow
          icon={<Sparkles className="h-4 w-4" />}
          tone="ai"
          label="AI Coach"
          hint="Разбор дня и ответы на основе ваших данных"
          trailing={
            <Switch
              checked={ai.coachEnabled}
              onCheckedChange={(checked) => onChange({ ...ai, coachEnabled: checked })}
              aria-label="AI Coach"
            />
          }
        />

        <SettingsRow
          icon={<FileText className="h-4 w-4" />}
          tone="ai"
          label="Ежедневные отчёты"
          hint="Итоги дня утром следующего"
          disabled={!ai.coachEnabled}
          trailing={
            <Switch
              checked={ai.dailyReport && ai.coachEnabled}
              disabled={!ai.coachEnabled}
              onCheckedChange={(checked) => onChange({ ...ai, dailyReport: checked })}
              aria-label="Ежедневные отчёты"
            />
          }
        />

        <SettingsRow
          icon={<Camera className="h-4 w-4" />}
          tone="ai"
          label="AI Vision"
          hint="Анализ еды и внешности по фото"
          disabled
          trailing={<SoonBadge />}
        />
      </SettingsGroup>

      {!ai.coachEnabled && (
        <Card elevation="inset">
          <p className="p-3.5 text-caption text-muted-foreground">
            AI Coach выключен. Nova не отправляет ваши данные в Claude API, а раздел
            «Коуч» показывает, как включить его обратно.
          </p>
        </Card>
      )}
    </div>
  );
}
