"use client";

import { Camera, FileText, Sparkles } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Switch } from "@/shared/ui/switch";
import { SettingsGroup, SettingsRow } from "@/features/settings/components/settings-group";
import type { AiSettings } from "@/features/settings/types";

/**
 * What the AI side of the app is allowed to do.
 *
 * All three switches are enforced server-side — none is a stored intention:
 *
 *   - AI Coach: off means getCoachOverview refuses to build an analysis and
 *     nothing is sent to Gemini — the Coach screen shows why.
 *   - Ежедневные отчёты: off means generate-daily-brief.action refuses, and
 *     the screen keeps the deterministic analysis it always had. Nothing is
 *     scheduled or pushed — the briefing is written on the day's first visit
 *     and cached.
 *   - AI Vision: off means the two photo-analysis actions refuse, so the
 *     camera still opens and the form still works by hand.
 *
 * Turning the coach off greys out Ежедневные отчёты only — a briefing is the
 * Coach speaking, so it cannot mean anything without it. AI Vision stays
 * tappable because reading a plate of food is not the Coach talking, and
 * greying it out would claim a dependency that does not exist.
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
          hint="Разбор дня и ответы на основе твоих данных"
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
          hint="Персональный разбор дня при первом входе"
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
          trailing={
            <Switch
              checked={ai.vision}
              onCheckedChange={(checked) => onChange({ ...ai, vision: checked })}
              aria-label="AI Vision"
            />
          }
        />
      </SettingsGroup>

      {!ai.coachEnabled && (
        <Card elevation="inset">
          <p className="p-3.5 text-caption text-muted-foreground">
            AI Coach выключен. Nova не отправляет твои данные в Gemini API, а раздел
            «Коуч» показывает, как включить его обратно.
          </p>
        </Card>
      )}
    </div>
  );
}
