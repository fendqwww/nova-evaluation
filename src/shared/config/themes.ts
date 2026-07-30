/**
 * The accent palettes a user can pick from.
 *
 * Lives in shared/config rather than in the onboarding feature because the
 * theme is not an onboarding question — it's a personalisation setting that
 * belongs to the profile screen. Every new user starts on Nova Blue (the
 * Prisma default) and the app stays branded until they deliberately change it.
 */
export const THEME_VALUES = [
  "ocean",
  "emerald",
  "purple",
  "rose",
  "orange",
  "graphite",
] as const;

export type ThemeValue = (typeof THEME_VALUES)[number];

// "ocean" is the historical db value for what the product now calls
// "Nova Blue" — the default every new profile gets (see the schema's
// @default("ocean")). Kept as-is to avoid a migration; only the label and
// hex changed to match the current brand blue.
export const THEME_LABELS: Record<ThemeValue, string> = {
  ocean: "Nova Blue",
  emerald: "Emerald",
  purple: "Purple",
  rose: "Rose",
  orange: "Orange",
  graphite: "Graphite",
};

// Kept in sync by hand with the [data-theme] blocks in src/app/globals.css.
// A theme is a single hue — this is the one hex the preview swatch shows,
// the same value the ring, buttons and every accent-* token will use.
export const THEME_SWATCH_HEX: Record<ThemeValue, string> = {
  ocean: "#2F6FEB",
  emerald: "#1FA971",
  purple: "#7C5CFC",
  rose: "#E8436A",
  orange: "#EA7C1F",
  graphite: "#838A9C",
};

export const THEME_OPTIONS = THEME_VALUES.map((value) => ({
  value,
  label: THEME_LABELS[value],
  swatch: THEME_SWATCH_HEX[value],
}));

export type ThemeOption = (typeof THEME_OPTIONS)[number];

export const DEFAULT_THEME: ThemeValue = "ocean";
