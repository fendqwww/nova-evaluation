"use client";

import { AtSign, CalendarDays, RotateCcw, UserRound } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Card } from "@/shared/ui/card";
import { SettingsGroup, SettingsRow } from "@/features/settings/components/settings-group";
import { formatInstant } from "@/features/settings/lib/format";
import type { SettingsAccount } from "@/features/settings/types";

/**
 * Who you are, read-only, with the one destructive-ish account action.
 *
 * Editing the name and the photo belongs to the Profile section, which owns
 * that data — this screen links there rather than growing a second form over
 * the same columns. Two forms writing one Profile row is exactly how two
 * screens end up disagreeing about what the user is called.
 *
 * "Пройти знакомство заново" sits here because it is the one thing that
 * rewrites the profile wholesale, and because it is the honest place to put it:
 * it is an account action, not a preference.
 */
export function AccountCard({
  account,
  onRestartOnboarding,
}: {
  account: SettingsAccount;
  onRestartOnboarding: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center gap-4 p-4">
          {/* Sized by prop, not by a class: Avatar writes width/height as an
              inline style, which a utility class cannot override. */}
          <Avatar src={account.photoUrl} name={account.name} size={56} />

          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-title text-foreground">{account.name}</p>
            <p className="truncate text-caption text-muted-foreground">
              {account.username ? `@${account.username}` : account.telegramName}
            </p>
          </div>
        </div>
      </Card>

      <SettingsGroup title="Аккаунт">
        <SettingsRow
          icon={<UserRound className="h-4 w-4" />}
          tone="accent"
          label="Профиль"
          hint="Имя, фото, параметры тела"
          href="/profile"
        />

        <SettingsRow
          icon={<AtSign className="h-4 w-4" />}
          label="Telegram"
          value={account.username ? `@${account.username}` : account.telegramName}
        />

        <SettingsRow
          icon={<CalendarDays className="h-4 w-4" />}
          label="В Nova с"
          value={formatInstant(account.createdAt).split(",")[0]}
        />

        <SettingsRow
          icon={<RotateCcw className="h-4 w-4" />}
          label="Пройти знакомство заново"
          hint="Ответы можно изменить. Цели, привычки и история останутся"
          onClick={onRestartOnboarding}
        />
      </SettingsGroup>
    </div>
  );
}
