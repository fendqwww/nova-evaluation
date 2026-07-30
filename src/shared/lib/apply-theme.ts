/**
 * The one place that knows how a chosen palette reaches the DOM.
 *
 * Themes are plain `[data-theme]` blocks in globals.css, so applying one is
 * a single attribute write on <html>. Kept out of components so the theme
 * preview during onboarding and the restore-from-profile on session load
 * stay the same operation.
 */
export function applyThemeColor(theme: string): void {
  document.documentElement.dataset.theme = theme;
}
