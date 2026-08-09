"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Whether this screen was opened by the Dashboard's "Спросить AI Coach" button.
 *
 * The same one-shot query read `useAddIntent` performs for the record sheet,
 * kept separate because the parameter and the meaning differ: `?ask=1` says
 * "this person came here to type", not "open this form".
 *
 * Captured with a lazy `useState` initialiser rather than a ref, for the reason
 * spelled out in use-add-intent.ts: refs cannot be read during render, and the
 * value has to survive the URL rewrite in the effect below.
 */
export function useAskIntent(): string | null {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("ask");

  const [captured] = useState(() => raw);

  useEffect(() => {
    if (raw !== null) {
      router.replace(pathname, { scroll: false });
    }
  }, [raw, pathname, router]);

  return captured;
}
