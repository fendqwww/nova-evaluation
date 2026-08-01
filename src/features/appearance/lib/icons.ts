import {
  Droplet,
  Hand,
  PersonStanding,
  Scissors,
  Smile,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { AREA_HINTS, AREA_ORDER, areaLabel } from "@/features/appearance/lib/areas";
import type { CareArea, CareTime } from "@/features/appearance/types";

/**
 * One icon per care area, declared once.
 *
 * Kept apart from lib/areas.ts so the labels, hints and ordering stay
 * importable from server code — this module pulls in lucide-react, and
 * appearance.repository.ts has no business shipping an icon set. Same split
 * workouts makes between lib/categories.ts and the components that render it.
 */
export const AREA_ICONS: Record<CareArea, LucideIcon> = {
  skin: Droplet,
  hair: Scissors,
  teeth: Smile,
  body: PersonStanding,
  beard: UserRound,
  nails: Hand,
  custom: Sparkles,
};

export interface AreaOption {
  id: CareArea;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export const AREA_OPTIONS: AreaOption[] = AREA_ORDER.map((area) => ({
  id: area,
  label: areaLabel(area),
  hint: AREA_HINTS[area],
  icon: AREA_ICONS[area],
}));

/**
 * The order the day's routines are grouped in: morning, evening, then the ones
 * with no natural time. "any" last rather than first — a routine that can
 * happen whenever should not push the one that has to happen before work down
 * the screen.
 */
export const TIME_ORDER: readonly CareTime[] = ["morning", "evening", "any"] as const;
