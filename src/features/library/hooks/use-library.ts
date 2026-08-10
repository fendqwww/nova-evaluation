"use client";

import { useQuery } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getLibrary } from "@/features/library/server/get-library.action";

export function libraryQueryKey(rawInitData: string | undefined) {
  return ["library", rawInitData] as const;
}

/**
 * Библиотека. Только чтение — здесь нечего писать.
 *
 * Прогресса чтения в Nova нет намеренно: приложение не знает, открыл ли человек
 * книгу, а галочка «прочитано», которую он ставит сам, — это ещё один список
 * задач, который начинают и бросают. Раздел отвечает на вопрос «что мне читать и
 * почему», и на этом его работа заканчивается.
 */
export function useLibrary() {
  const rawInitData = useRawInitData();

  const query = useQuery({
    queryKey: libraryQueryKey(rawInitData),
    queryFn: () => getLibrary(rawInitData),
  });

  return {
    snapshot: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}
