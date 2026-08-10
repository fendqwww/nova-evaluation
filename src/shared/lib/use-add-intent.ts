"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Reads the `?add=` intent a screen was navigated to with.
 *
 * The record sheet in the tab bar cannot open Nutrition's food picker or
 * Sleep's log form directly — those modals belong to their own features and
 * carry state the sheet has no business owning. So the sheet navigates with an
 * intent instead (`/nutrition?add=photo`) and the destination screen opens the
 * right form on arrival. This hook is the destination half.
 *
 * The value is captured on the first render that sees it and returned from a
 * ref afterwards, so it survives the URL rewrite below. That rewrite happens in
 * an effect because it talks to the router — an external system — and never
 * touches React state: a `setState` here would cascade a render, which is what
 * `react-hooks/set-state-in-effect` exists to catch and what the rest of this
 * codebase already avoids by remounting modals on a bumped key.
 *
 * Callers must treat the result as *derived*, not as an event: hold it in a
 * `const open = intent === "x" && !dismissed` expression rather than pushing it
 * into state.
 */
export function useAddIntent(): string | null {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("add");

  // A lazy initialiser, not a ref: it reads the query exactly once at mount, so
  // the first paint already knows the intent and the value survives the URL
  // rewrite below. A ref would be the obvious way to hold something "just once"
  // and is wrong here — refs cannot be read during render.
  const [captured] = useState(() => raw);

  useEffect(() => {
    // Strip the query so a back navigation does not reopen the form, and so a
    // remount does not read the intent a second time.
    if (raw !== null) {
      router.replace(pathname, { scroll: false });
    }
  }, [raw, pathname, router]);

  return captured;
}

/**
 * Спутник интента — дополнительный параметр, приехавший вместе с `?add=`.
 *
 * План дня на главном экране называет конкретный приём пищи, и ссылка
 * «Ужин» несёт `?add=food&slot=dinner`. Без этого раздел «Питание» открывал бы
 * выбор продукта с завтраком по умолчанию, то есть терял бы ровно ту
 * информацию, ради которой на строку и нажали.
 *
 * Отдельный хук, а не второе возвращаемое значение useAddIntent: переписывание
 * адреса принадлежит именно тому хуку, и второй владелец у этого эффекта
 * означал бы две попытки заменить URL на одном монтировании. Здесь только
 * чтение — тем же однократным захватом, поэтому значение переживает очистку
 * адреса, которую сделает сосед.
 */
export function useAddIntentParam(name: string): string | null {
  const searchParams = useSearchParams();
  const [captured] = useState(() => searchParams.get(name));
  return captured;
}
