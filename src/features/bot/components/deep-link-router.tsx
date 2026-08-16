"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { retrieveLaunchParams } from "@tma.js/sdk-react";
import { decodeDeepLink, encodeDeepLink } from "@/shared/config/deep-links";

/**
 * Приземление по ссылке из бота.
 *
 * Кнопка под сообщением ведёт на `t.me/NovaEvaluation_bot?startapp=%2Fhabits`,
 * и Telegram передаёт этот параметр приложению при запуске. Без обработчика он
 * просто игнорируется: кнопка «Отметить привычки» открывала бы главный экран, и
 * человек искал бы раздел сам — то есть ровно то, чего сообщение пыталось
 * избежать.
 *
 * Разрешены только внутренние пути и только из белого списка. Параметр
 * приходит из URL, то есть от кого угодно: ссылку `?startapp=https%3A%2F%2Fevil`
 * может составить любой, и без проверки она превратила бы приложение в открытый
 * редирект под доменом Telegram. Белый список — не паранойя: это единственный
 * способ гарантировать, что переход ведёт туда, куда обещает кнопка.
 */

export function DeepLinkRouter() {
  const router = useRouter();
  // Переход выполняется один раз за запуск: без этого возврат на главную
  // кнопкой «назад» немедленно отбрасывал бы обратно в раздел.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const target = readStartParam();
    if (target && target !== "/") {
      router.replace(target);
    }
  }, [router]);

  return null;
}

function readStartParam(): string | null {
  try {
    const params = retrieveLaunchParams();
    const raw = params.tgWebAppStartParam;
    if (typeof raw !== "string" || raw === "") return null;

    // Telegram отдаёт значение уже раскодированным, но ссылку мог собрать и
    // кто-то другой — decodeURIComponent на всякий случай, с защитой от
    // некорректной последовательности.
    const decoded = safeDecode(raw);

    // Сначала новый формат («habits», «settings_subscription»), затем — путь
    // как есть: ссылки старого вида могли остаться в уже отправленных
    // сообщениях, и ломать их не за что. Проверка по списку разрешённых путей
    // живёт внутри decodeDeepLink, то есть в одном месте с кодированием.
    return decodeDeepLink(decoded) ?? decodeDeepLink(encodeDeepLink(decoded));
  } catch {
    // Запуск вне Telegram: параметров нет, приземлять некуда.
    return null;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
