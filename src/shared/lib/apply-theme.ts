/**
 * The one place that knows how a chosen palette reaches the DOM.
 *
 * Themes are plain `[data-theme]` blocks in globals.css, so applying one is
 * a single attribute write on <html>. Kept out of components so the theme
 * preview during onboarding and the restore-from-profile on session load
 * stay the same operation.
 */
import { cacheThemeColor, cacheThemeMode } from "@/shared/lib/theme-storage";

export function applyThemeColor(theme: string): void {
  document.documentElement.dataset.theme = theme;
  // Кэшируется здесь, а не у вызывающих: применение темы и запоминание темы —
  // одно событие, и разнести их значило бы завести состояние, в котором на
  // экране одно, а на следующем старте другое.
  cacheThemeColor(theme);
}

/**
 * Light/dark, the second axis.
 *
 * Written as `data-mode` on the same element `data-theme` lives on, so the two
 * compose without either knowing about the other: the mode swaps the surface
 * and text tokens, the theme swaps the single accent hue.
 *
 * Only ever "light" or "dark" reaches the DOM. "system" is a *policy*, not a
 * value — resolving it is what systemMode() below does, and it has to be
 * re-resolved whenever the device changes its mind, which is why applying it is
 * a subscription rather than a one-off write.
 */
export function applyThemeMode(mode: "light" | "dark"): void {
  document.documentElement.dataset.mode = mode;
  // color-scheme drives the native bits the CSS cannot reach: form controls,
  // scrollbars and the overscroll gutter. Without it a light page keeps a dark
  // scrollbar, which is the one thing that gives away a theme as half-applied.
  document.documentElement.style.colorScheme = mode;
}

/** What the device currently prefers. Defaults to dark — Nova's native look. */
export function systemMode(): "light" | "dark" {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * Apply a theme mode and keep it applied.
 *
 * Returns an unsubscribe function. For "light" and "dark" there is nothing to
 * listen to and the returned function is a no-op; for "system" it attaches a
 * media-query listener, because a user who flips their phone to dark at sunset
 * expects the app in their hand to follow without being reopened.
 *
 * Deliberately not a React hook: SessionBoundary is the only caller today, but
 * the operation is a DOM write with a subscription, and keeping it here means
 * the settings screen's optimistic preview and the session restore run exactly
 * the same code.
 */
export function watchThemeMode(mode: "light" | "dark" | "system"): () => void {
  // Запоминается политика, а не результат её разрешения — «как на устройстве»
  // должно остаться «как на устройстве» и после перезапуска.
  cacheThemeMode(mode);

  if (mode !== "system") {
    applyThemeMode(mode);
    return () => {};
  }

  applyThemeMode(systemMode());

  if (typeof window === "undefined" || !window.matchMedia) return () => {};

  const query = window.matchMedia("(prefers-color-scheme: light)");
  const onChange = (event: MediaQueryListEvent) => {
    applyThemeMode(event.matches ? "light" : "dark");
  };

  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
