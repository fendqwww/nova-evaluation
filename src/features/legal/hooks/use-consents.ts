"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import {
  acceptConsentsAction,
  getConsentStateAction,
  revokeConsentAction,
} from "@/features/legal/server/consent.action";
import { REQUIRED_CONSENTS, type ConsentId } from "@/features/legal/constants";
import { settingsQueryKey } from "@/features/settings/hooks/use-settings";

export function consentQueryKey(rawInitData: string | undefined) {
  return ["consents", rawInitData ?? "anonymous"] as const;
}

/** Состояние согласий пользователя — для гейта и для настроек. */
export function useConsentState() {
  const rawInitData = useRawInitData();

  const query = useQuery({
    queryKey: consentQueryKey(rawInitData),
    queryFn: () => getConsentStateAction({ rawInitData }),
    // Согласие меняется редко и только действием самого пользователя, поэтому
    // перезапрашивать его при каждом фокусе окна незачем.
    staleTime: 5 * 60_000,
  });

  return {
    state: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}

/**
 * Форма согласия: что отмечено, можно ли отправлять, отправка.
 *
 * `initial` — то, что уже дано: на экране повторного согласия отметки, ранее
 * поставленные пользователем, восстанавливаются, чтобы правка одного документа
 * не заставляла заново читать и подтверждать всё остальное.
 */
export function useConsentForm(initial: readonly ConsentId[] = []) {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const [granted, setGranted] = useState<ConsentId[]>([...initial]);

  const mutation = useMutation({
    mutationFn: () => acceptConsentsAction({ rawInitData, granted }),
    onSuccess: (state) => {
      queryClient.setQueryData(consentQueryKey(rawInitData), state);
      // Настройки AI могли измениться вместе с согласием — снимок настроек
      // теперь устарел.
      void queryClient.invalidateQueries({ queryKey: settingsQueryKey(rawInitData) });
    },
  });

  return {
    granted,
    setGranted,
    canSubmit: REQUIRED_CONSENTS.every((required) => granted.includes(required)),
    submit: () => mutation.mutateAsync(),
    isSubmitting: mutation.isPending,
    error: mutation.isError ? "Не удалось сохранить согласие. Попробуйте ещё раз." : null,
  };
}

/** Отзыв согласия на трансграничную передачу — из настроек. */
export function useRevokeConsent() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consentId: ConsentId) => revokeConsentAction({ rawInitData, consentId }),
    onSuccess: (state) => {
      queryClient.setQueryData(consentQueryKey(rawInitData), state);
      void queryClient.invalidateQueries({ queryKey: settingsQueryKey(rawInitData) });
    },
  });
}
