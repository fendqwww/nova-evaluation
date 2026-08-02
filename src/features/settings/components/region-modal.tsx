"use client";

import { useState, type ReactNode } from "react";
import { Check, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { cn } from "@/shared/lib/cn";
import {
  DATE_FORMATS,
  DATE_FORMAT_LABELS,
  LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_READY,
  UNIT_SYSTEMS,
  UNIT_SYSTEM_HINTS,
  UNIT_SYSTEM_LABELS,
  type RegionDraft,
} from "@/features/settings/schemas";
import {
  TIMEZONE_GROUPS,
  TIMEZONE_OPTIONS,
  zoneClock,
  zoneOffsetLabel,
} from "@/features/settings/lib/timezones";

/**
 * All four region choices in one modal, saved once.
 *
 * The timezone is the reason this is a modal at all: it is a searchable list of
 * thirty-odd entries, which is not a row on a settings screen. The other three
 * come along because they are the same question ("where am I and how do I read
 * numbers") and because saving them together is one write instead of four —
 * see the note on regionDraftSchema.
 *
 * Seeded from props on mount and never re-synced by an effect: the caller
 * remounts it on every open (a key), which is the same convention every other
 * form modal in this app follows. That is what makes "cancel" mean cancel.
 */
export function RegionModal({
  open,
  onOpenChange,
  initial,
  isSaving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: RegionDraft;
  isSaving: boolean;
  onSave: (draft: RegionDraft) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<RegionDraft>(initial);
  const [zoneQuery, setZoneQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const query = zoneQuery.trim().toLowerCase();
  const zones = TIMEZONE_OPTIONS.filter(
    (option) =>
      query === "" ||
      option.city.toLowerCase().includes(query) ||
      option.id.toLowerCase().includes(query),
  );

  async function save() {
    setError(null);
    try {
      await onSave(draft);
      onOpenChange(false);
    } catch {
      setError("Не удалось сохранить. Попробуйте ещё раз.");
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Регион</ModalTitle>
          <ModalDescription>
            Часовой пояс определяет, когда у вас начинается новый день.
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-6">
          <Field label="Язык">
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((language) => (
                <ChoiceButton
                  key={language}
                  label={LANGUAGE_LABELS[language]}
                  hint={LANGUAGE_READY[language] ? null : "Скоро"}
                  selected={draft.language === language}
                  disabled={!LANGUAGE_READY[language]}
                  onSelect={() => setDraft({ ...draft, language })}
                />
              ))}
            </div>
          </Field>

          <Field label="Часовой пояс">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
              <Input
                value={zoneQuery}
                onChange={(event) => setZoneQuery(event.target.value)}
                placeholder="Поиск города"
                className="pl-10"
              />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
              {zones.length === 0 && (
                <p className="px-4 py-6 text-center text-caption text-muted-foreground">
                  Ничего не найдено
                </p>
              )}

              {TIMEZONE_GROUPS.map((group) => {
                const inGroup = zones.filter((option) => option.group === group);
                if (inGroup.length === 0) return null;

                return (
                  <div key={group}>
                    <p className="sticky top-0 z-10 bg-surface-2 px-4 py-1.5 text-label text-subtle-foreground">
                      {group.toUpperCase()}
                    </p>

                    {inGroup.map((option) => {
                      const selected = draft.timezone === option.id;
                      const offset = zoneOffsetLabel(option.id);

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setDraft({ ...draft, timezone: option.id })}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200",
                            selected && "bg-accent-muted",
                          )}
                        >
                          <span className="flex-1 truncate text-body text-foreground">
                            {option.city}
                          </span>
                          <span className="numeric shrink-0 text-caption text-muted-foreground">
                            {zoneClock(option.id) ?? ""}
                          </span>
                          {offset && (
                            <span className="shrink-0 text-caption text-subtle-foreground">
                              {offset}
                            </span>
                          )}
                          {selected && <Check className="h-4 w-4 shrink-0 text-accent" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </Field>

          <Field label="Формат даты">
            <div className="grid grid-cols-3 gap-2">
              {DATE_FORMATS.map((format) => (
                <ChoiceButton
                  key={format}
                  label={DATE_FORMAT_LABELS[format]}
                  selected={draft.dateFormat === format}
                  onSelect={() => setDraft({ ...draft, dateFormat: format })}
                />
              ))}
            </div>
          </Field>

          <Field label="Единицы измерения">
            <div className="grid grid-cols-2 gap-2">
              {UNIT_SYSTEMS.map((system) => (
                <ChoiceButton
                  key={system}
                  label={UNIT_SYSTEM_LABELS[system]}
                  hint={UNIT_SYSTEM_HINTS[system]}
                  selected={draft.unitSystem === system}
                  onSelect={() => setDraft({ ...draft, unitSystem: system })}
                />
              ))}
            </div>
          </Field>

          {error && <p className="text-caption text-destructive">{error}</p>}

          <Button size="lg" onClick={save} disabled={isSaving}>
            {isSaving ? "Сохраняем…" : "Сохранить"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption font-medium text-subtle-foreground">{label}</p>
      {children}
    </div>
  );
}

function ChoiceButton({
  label,
  hint,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  hint?: string | null;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors duration-200",
        selected
          ? "border-accent-border bg-accent-muted text-foreground"
          : "border-border bg-input text-muted-foreground",
        disabled && "opacity-45",
      )}
    >
      <span className="text-body font-medium text-foreground">{label}</span>
      {hint && <span className="text-caption text-subtle-foreground">{hint}</span>}
    </button>
  );
}
