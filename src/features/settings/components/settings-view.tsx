"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarDays,
  Crown,
  Download,
  FileText,
  Globe2,
  Info,
  Languages,
  LifeBuoy,
  Ruler,
  ScrollText,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { SettingsSkeleton } from "@/features/settings/components/settings-skeleton";
import { SettingsGroup, SettingsRow } from "@/features/settings/components/settings-group";
import { AccountCard } from "@/features/settings/components/account-card";
import {
  AppearanceGroup,
  LightModeNotice,
} from "@/features/settings/components/appearance-group";
import { NotificationsGroup } from "@/features/settings/components/notifications-group";
import { AiGroup } from "@/features/settings/components/ai-group";
import { RegionModal } from "@/features/settings/components/region-modal";
import { ArchiveModal } from "@/features/settings/components/archive-modal";
import { ExportModal } from "@/features/settings/components/export-modal";
import { ClearDataModal } from "@/features/settings/components/clear-data-modal";
import { LegalModal } from "@/features/settings/components/legal-modal";
import { ChangelogModal } from "@/features/settings/components/changelog-modal";
import { zoneLabel, zoneOffsetLabel } from "@/features/settings/lib/timezones";
import { PRIVACY_POLICY, TERMS_OF_USE, type LegalDocument } from "@/features/settings/lib/legal";
import { APP_STAGE, APP_VERSION, SUPPORT_HANDLE, SUPPORT_URL } from "@/features/settings/lib/about";
import { PLAN_LABELS } from "@/features/settings/lib/plans";
import {
  DATE_FORMAT_LABELS,
  LANGUAGE_LABELS,
  UNIT_SYSTEM_LABELS,
} from "@/features/settings/schemas";
import { DEFAULT_THEME, type ThemeValue } from "@/shared/config/themes";
import { useTelegramSession } from "@/features/auth/hooks/use-telegram-session";

/**
 * Настройки — nine groups on one scroll.
 *
 * The structure is deliberately flat. Every other section of this app splits
 * into tabs, but tabs separate different *questions*, and these are one
 * question asked repeatedly; a user arrives here looking for a specific switch,
 * and the fastest path to a specific switch is a labelled list, not a guess at
 * which of four tabs it lives under. Everything that needs more room than a row
 * — the timezone list, the archive, the export, the legal text — opens in a
 * modal, and only the subscription gets a route of its own because it is three
 * screens of reading.
 *
 * The accent theme is read from the session rather than from this screen's
 * snapshot: it lives on Profile, is already applied by SessionBoundary, and
 * duplicating it into the settings payload would give the app two answers to
 * one question.
 */
export function SettingsView() {
  const router = useRouter();
  const { data: session } = useTelegramSession();
  const {
    account,
    settings,
    archiveCount,
    isPending,
    isError,
    retry,
    setThemeMode,
    setNotifications,
    setAi,
    saveRegion,
    isSavingRegion,
    restartOnboarding,
    isRestartingOnboarding,
  } = useSettings();

  const [regionOpen, setRegionOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [legal, setLegal] = useState<LegalDocument | null>(null);

  // Modal state is seeded from props on mount and never re-synced, so every
  // open has to be a fresh mount — this key is what forces one. Same convention
  // as the appearance and nutrition form modals.
  const [regionKey, setRegionKey] = useState(0);

  async function onRestartOnboarding() {
    if (isRestartingOnboarding) return;
    await restartOnboarding();
    router.push("/onboarding");
  }

  const themeColor = (session?.profile?.themeColor as ThemeValue) ?? DEFAULT_THEME;

  function openRegion() {
    setRegionKey((n) => n + 1);
    setRegionOpen(true);
  }

  const zoneOffset = account ? zoneOffsetLabel(account.timezone) : null;

  return (
    <PageContainer className="flex flex-col gap-6">
      <header className="flex animate-[rise-in_var(--duration-slow)_var(--ease-enter)_both] flex-col gap-0.5">
        <h1 className="text-[1.375rem] font-bold tracking-[-0.028em] text-foreground">
          Настройки
        </h1>
        <p className="text-caption text-muted-foreground">
          Аккаунт, оформление и данные Nova
        </p>
      </header>

      {isPending && <SettingsSkeleton />}

      {isError && (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="Не удалось загрузить настройки"
          description="Проверьте соединение и попробуйте снова."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {!isPending && !isError && account && settings && (
        <>
          <AccountCard account={account} onRestartOnboarding={onRestartOnboarding} />

          <SettingsGroup title="Подписка">
            <SettingsRow
              icon={<Crown className="h-4 w-4" />}
              tone="goal"
              label="Тариф Nova"
              hint="Сравнить возможности FREE, PLUS и MAX"
              value={PLAN_LABELS[settings.plan]}
              href="/settings/subscription"
            />
          </SettingsGroup>

          <div className="flex flex-col gap-2">
            <AppearanceGroup
              mode={settings.themeMode}
              themeColor={themeColor}
              onChange={setThemeMode}
            />
            {settings.themeMode === "light" && <LightModeNotice />}
          </div>

          <SettingsGroup title="Регион">
            <SettingsRow
              icon={<Globe2 className="h-4 w-4" />}
              tone="task"
              label="Часовой пояс"
              hint={`Определяет, когда начинается новый день${zoneOffset ? ` · ${zoneOffset}` : ""}`}
              value={zoneLabel(account.timezone)}
              onClick={openRegion}
            />
            <SettingsRow
              icon={<Languages className="h-4 w-4" />}
              label="Язык"
              value={LANGUAGE_LABELS[settings.language]}
              onClick={openRegion}
            />
            <SettingsRow
              icon={<CalendarDays className="h-4 w-4" />}
              label="Формат даты"
              value={DATE_FORMAT_LABELS[settings.dateFormat]}
              onClick={openRegion}
            />
            <SettingsRow
              icon={<Ruler className="h-4 w-4" />}
              label="Единицы измерения"
              value={UNIT_SYSTEM_LABELS[settings.unitSystem]}
              onClick={openRegion}
            />
          </SettingsGroup>

          <NotificationsGroup
            notifications={settings.notifications}
            onChange={setNotifications}
          />

          <AiGroup ai={settings.ai} onChange={setAi} />

          <SettingsGroup title="Данные">
            <SettingsRow
              icon={<Download className="h-4 w-4" />}
              tone="score"
              label="Экспорт данных"
              hint="Всё, что хранит Nova, одним файлом"
              onClick={() => setExportOpen(true)}
            />
            <SettingsRow
              icon={<Archive className="h-4 w-4" />}
              label="Архив"
              hint="Привычки, тренировки, продукты и уход, убранные из активных"
              value={archiveCount > 0 ? String(archiveCount) : "Пусто"}
              onClick={() => setArchiveOpen(true)}
            />
            <SettingsRow
              icon={<Trash2 className="h-4 w-4" />}
              label="Очистка истории"
              hint="По разделам. Отменить нельзя"
              destructive
              onClick={() => setClearOpen(true)}
            />
          </SettingsGroup>

          <SettingsGroup title="Конфиденциальность">
            <SettingsRow
              icon={<Shield className="h-4 w-4" />}
              tone="score"
              label="Политика конфиденциальности"
              hint="Что хранится и что уходит наружу"
              onClick={() => setLegal(PRIVACY_POLICY)}
            />
            <SettingsRow
              icon={<ScrollText className="h-4 w-4" />}
              label="Пользовательское соглашение"
              onClick={() => setLegal(TERMS_OF_USE)}
            />
          </SettingsGroup>

          <SettingsGroup title="О приложении">
            <SettingsRow
              icon={<Info className="h-4 w-4" />}
              tone="accent"
              label="Версия"
              value={`${APP_VERSION} · ${APP_STAGE}`}
            />
            <SettingsRow
              icon={<FileText className="h-4 w-4" />}
              label="Что нового"
              hint="История обновлений Nova"
              onClick={() => setChangelogOpen(true)}
            />
            <SettingsRow
              icon={<LifeBuoy className="h-4 w-4" />}
              label="Поддержка"
              value={SUPPORT_HANDLE}
              href={SUPPORT_URL}
            />
          </SettingsGroup>

          <Card elevation="inset">
            <p className="p-4 text-center text-caption text-muted-foreground">
              Nova {APP_VERSION} · сделано, чтобы вы видели свою жизнь целиком
            </p>
          </Card>

          <RegionModal
            key={`region-${regionKey}`}
            open={regionOpen}
            onOpenChange={setRegionOpen}
            initial={{
              language: settings.language,
              timezone: account.timezone,
              dateFormat: settings.dateFormat,
              unitSystem: settings.unitSystem,
            }}
            isSaving={isSavingRegion}
            onSave={saveRegion}
          />

          <ArchiveModal open={archiveOpen} onOpenChange={setArchiveOpen} />
          <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
          <ClearDataModal open={clearOpen} onOpenChange={setClearOpen} />

          <ChangelogModal
            open={changelogOpen}
            onOpenChange={setChangelogOpen}
            dateFormat={settings.dateFormat}
          />

          <LegalModal
            document={legal}
            open={legal !== null}
            onOpenChange={(next) => !next && setLegal(null)}
            dateFormat={settings.dateFormat}
          />
        </>
      )}
    </PageContainer>
  );
}
