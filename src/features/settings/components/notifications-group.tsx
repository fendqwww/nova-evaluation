"use client";

import {
  Dumbbell,
  ListTodo,
  Repeat,
  Sparkles,
  Utensils,
  Wand2,
} from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Switch } from "@/shared/ui/switch";
import { SettingsGroup, SettingsRow } from "@/features/settings/components/settings-group";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_HINTS,
  NOTIFICATION_LABELS,
} from "@/features/settings/schemas";
import type { NotificationChannel, NotificationSettings } from "@/features/settings/types";

const CHANNEL_ICONS: Record<NotificationChannel, typeof Repeat> = {
  habits: Repeat,
  tasks: ListTodo,
  nutrition: Utensils,
  workouts: Dumbbell,
  appearance: Wand2,
  coach: Sparkles,
};

const CHANNEL_TONES: Record<NotificationChannel, "habit" | "task" | "score" | "ai"> = {
  habits: "habit",
  tasks: "task",
  nutrition: "score",
  workouts: "score",
  appearance: "score",
  coach: "ai",
};

/**
 * Six switches, one per section.
 *
 * Nothing sends a notification yet, and the card above the list says exactly
 * that rather than letting six confident-looking toggles imply a scheduler that
 * does not exist. Storing the choice now is still worth doing: when delivery
 * lands it reads these rather than asking every user to configure a feature
 * they thought they already had.
 *
 * Each flip sends the whole set — see updateNotificationsAction for why.
 */
export function NotificationsGroup({
  notifications,
  onChange,
}: {
  notifications: NotificationSettings;
  onChange: (next: NotificationSettings) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SettingsGroup title="Уведомления">
        {NOTIFICATION_CHANNELS.map((channel) => {
          const Icon = CHANNEL_ICONS[channel];

          return (
            <SettingsRow
              key={channel}
              icon={<Icon className="h-4 w-4" />}
              tone={CHANNEL_TONES[channel]}
              label={NOTIFICATION_LABELS[channel]}
              hint={NOTIFICATION_HINTS[channel]}
              trailing={
                <Switch
                  checked={notifications[channel]}
                  onCheckedChange={(checked) =>
                    onChange({ ...notifications, [channel]: checked })
                  }
                  aria-label={NOTIFICATION_LABELS[channel]}
                />
              }
            />
          );
        })}
      </SettingsGroup>

      <Card elevation="inset">
        <p className="p-3.5 text-caption text-muted-foreground">
          Отправка уведомлений ещё не подключена — Nova запоминает выбор, чтобы
          включить его сразу, как только появится рассылка.
        </p>
      </Card>
    </div>
  );
}
