"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getSettingsSnapshot } from "@/features/settings/server/get-settings.action";
import { updateThemeModeAction } from "@/features/settings/server/update-theme-mode.action";
import { updateRegionAction } from "@/features/settings/server/update-region.action";
import { updateNotificationsAction } from "@/features/settings/server/update-notifications.action";
import { updateAiAction } from "@/features/settings/server/update-ai.action";
import { restartOnboardingAction } from "@/features/settings/server/restart-onboarding.action";
import { sessionQueryKey } from "@/features/auth/hooks/use-telegram-session";
import { dashboardQueryKey } from "@/features/dashboard/hooks/use-dashboard-data";
import { applyThemeMode, systemMode } from "@/shared/lib/apply-theme";
import type {
  AiDraft,
  NotificationsDraft,
  RegionDraft,
} from "@/features/settings/schemas";
import type { SettingsSnapshot, ThemeMode } from "@/features/settings/types";

export function settingsQueryKey(rawInitData: string | undefined) {
  return ["settings", rawInitData] as const;
}

/** Paint a mode immediately, resolving "system" the way SessionBoundary will. */
function preview(mode: ThemeMode): void {
  applyThemeMode(mode === "system" ? systemMode() : mode);
}

/**
 * The settings snapshot and every write on it.
 *
 * Three of the four mutations are optimistic, which is unusual for this app —
 * elsewhere only the interactions that happen several times a day get that
 * treatment. A settings toggle earns it for a different reason: a switch that
 * waits for a round trip before moving reads as broken input rather than as
 * pending work, and the user is looking straight at it when it happens.
 *
 * refresh() invalidates the session too, and that is load-bearing rather than
 * housekeeping: the session carries themeMode (painted on every cold start) and
 * the Profile timezone that the region form writes. Leaving it stale would mean
 * changing the zone here and having every *other* screen keep resolving "today"
 * from the old one until the app was reopened. The Dashboard goes with it for
 * the same reason — its Life Score is computed server-side against that zone.
 */
export function useSettings() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = settingsQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getSettingsSnapshot(rawInitData),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: sessionQueryKey(rawInitData) });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
  }

  async function applyOptimistic(update: (snapshot: SettingsSnapshot) => SettingsSnapshot) {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<SettingsSnapshot>(key);
    if (previous) queryClient.setQueryData<SettingsSnapshot>(key, update(previous));
    return { previous };
  }

  function restore(context: { previous?: SettingsSnapshot } | undefined) {
    if (context?.previous) queryClient.setQueryData(key, context.previous);
  }

  const themeMode = useMutation({
    mutationFn: updateThemeModeAction,
    onMutate: ({ themeMode: next }) => {
      // The DOM moves before the request does — the whole point of a theme
      // control is that the app changes under your finger.
      //
      // A one-off write, not watchThemeMode: the subscription for "system"
      // belongs to SessionBoundary, which owns it for the app's lifetime and
      // cleans it up. Subscribing again here would add a listener per tap with
      // nothing to unsubscribe it. Resolving through systemMode() means the
      // preview still lands on exactly what SessionBoundary will settle on once
      // the refetched session arrives.
      preview(next);
      return applyOptimistic((snapshot) => ({
        ...snapshot,
        settings: { ...snapshot.settings, themeMode: next },
      }));
    },
    onError: (_error, _variables, context) => {
      restore(context);
      const reverted = context?.previous?.settings.themeMode;
      if (reverted) preview(reverted);
    },
    onSettled: refresh,
  });

  const notifications = useMutation({
    mutationFn: updateNotificationsAction,
    onMutate: ({ draft }) =>
      applyOptimistic((snapshot) => ({
        ...snapshot,
        settings: { ...snapshot.settings, notifications: draft },
      })),
    onError: (_error, _variables, context) => restore(context),
    onSettled: refresh,
  });

  const ai = useMutation({
    mutationFn: updateAiAction,
    onMutate: ({ draft }) =>
      applyOptimistic((snapshot) => ({
        ...snapshot,
        settings: { ...snapshot.settings, ai: draft },
      })),
    onError: (_error, _variables, context) => restore(context),
    onSettled: refresh,
  });

  // The region form saves once, inside a modal, where a short pending state is
  // honest — and it writes two tables, so an optimistic mirror would have to
  // guess at a partial failure. Same call every modal-based write in this app
  // makes.
  const region = useMutation({ mutationFn: updateRegionAction, onSuccess: refresh });

  const onboarding = useMutation({
    mutationFn: restartOnboardingAction,
    onSuccess: async () => {
      // /onboarding's own guard reads the session query straight out of the
      // cache and bounces back to "/" while onboardingCompleted is still
      // true there — so unlike `refresh()`'s fire-and-forget invalidation,
      // this one has to be awaited before the caller navigates.
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey(rawInitData) });
      refresh();
    },
  });

  const snapshot = query.data;

  return {
    account: snapshot?.account ?? null,
    settings: snapshot?.settings ?? null,
    archiveCount: snapshot?.archiveCount ?? 0,
    usage: snapshot?.usage ?? null,
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    refresh,

    setThemeMode: (mode: ThemeMode) => themeMode.mutate({ rawInitData, themeMode: mode }),
    setNotifications: (draft: NotificationsDraft) =>
      notifications.mutate({ rawInitData, draft }),
    setAi: (draft: AiDraft) => ai.mutate({ rawInitData, draft }),

    saveRegion: (draft: RegionDraft) => region.mutateAsync({ rawInitData, draft }),
    isSavingRegion: region.isPending,

    restartOnboarding: () => onboarding.mutateAsync({ rawInitData }),
    isRestartingOnboarding: onboarding.isPending,
  };
}
