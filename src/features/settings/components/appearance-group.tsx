"use client";

import { Moon, Palette, Smartphone, Sun } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { SettingsGroup, SettingsRow } from "@/features/settings/components/settings-group";
import { THEME_MODES, THEME_MODE_LABELS } from "@/features/settings/schemas";
import { THEME_LABELS, type ThemeValue } from "@/shared/config/themes";
import type { ThemeMode } from "@/features/settings/types";

const MODE_ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Smartphone,
};

/**
 * Light / dark / system, plus a way through to the accent picker.
 *
 * A three-up segmented control rather than three rows with a checkmark: the
 * options are mutually exclusive and the whole set fits on one line, so showing
 * them side by side makes the choice visible without a tap. It applies
 * instantly — the mutation writes to the DOM before it writes to the database
 * (see useSettings) — which is the only behaviour that makes sense for a
 * control whose entire subject is what you are looking at.
 *
 * The accent hue is a separate axis living on Profile and already has a picker
 * on the Profile screen. This links there rather than duplicating six swatches
 * in a second place.
 */
export function AppearanceGroup({
  mode,
  themeColor,
  onChange,
}: {
  mode: ThemeMode;
  themeColor: ThemeValue;
  onChange: (mode: ThemeMode) => void;
}) {
  return (
    <SettingsGroup title="Внешний вид">
      <div className="flex flex-col gap-3 p-4">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Тема">
          {THEME_MODES.map((option) => {
            const Icon = MODE_ICONS[option];
            const isActive = option === mode;

            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => onChange(option)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 transition-colors duration-200",
                  isActive
                    ? "border-accent-border bg-accent-muted text-foreground"
                    : "border-border bg-input text-muted-foreground active:text-foreground",
                )}
              >
                <Icon className={cn("h-4.5 w-4.5", isActive && "text-accent")} />
                <span className="text-caption font-medium">{THEME_MODE_LABELS[option]}</span>
              </button>
            );
          })}
        </div>

        {mode === "system" && (
          <p className="text-caption text-subtle-foreground">
            Nova следует за настройками устройства и переключается вместе с ними.
          </p>
        )}
      </div>

      <SettingsRow
        icon={<Palette className="h-4 w-4" />}
        tone="accent"
        label="Акцентный цвет"
        value={THEME_LABELS[themeColor]}
        href="/profile"
      />
    </SettingsGroup>
  );
}

/**
 * The provisional-light-mode notice.
 *
 * Rendered only while light is actually on. It exists because the light palette
 * is a token swap over an interface designed dark-first (see the note in
 * globals.css) — a few older surfaces still read flat, and a user noticing that
 * deserves to know it is a known state rather than a bug in their build.
 */
export function LightModeNotice() {
  return (
    <Card elevation="inset">
      <p className="p-3.5 text-caption text-muted-foreground">
        Светлая тема ещё дорабатывается: отдельные экраны пока выглядят проще, чем в
        тёмной. На данные это не влияет — переключиться обратно можно в любой момент.
      </p>
    </Card>
  );
}
