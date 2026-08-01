import { AREA_LABELS, CARE_AREAS } from "@/features/appearance/schemas";
import type { CareArea } from "@/features/appearance/types";

/**
 * The care areas, in the order they are always shown.
 *
 * Face down to hands, then whatever the user invented — a fixed order so the
 * filter row, the routine form and the stats breakdown never disagree about
 * where "Ногти" sits. Same convention MEAL_SLOTS uses for the diary.
 */
export const AREA_ORDER: readonly CareArea[] = CARE_AREAS;

export function areaLabel(area: CareArea): string {
  return AREA_LABELS[area];
}

/**
 * Whether an area is offered when creating something.
 *
 * Beard care is only proposed to a male profile — the alternative is every
 * woman scrolling past an area that will never apply to her. This gates the
 * *offer* only: isAreaVisible is never consulted on read, so a routine created
 * before a profile change keeps rendering with its real area rather than
 * silently becoming something else.
 */
export function isAreaOffered(area: CareArea, gender: string): boolean {
  return area === "beard" ? gender === "male" : true;
}

export function offeredAreas(gender: string): CareArea[] {
  return AREA_ORDER.filter((area) => isAreaOffered(area, gender));
}

/**
 * The short description under each area in the routine form's picker.
 *
 * Concrete examples rather than a restatement of the label: a user who has
 * never kept a care routine needs to know what belongs in "Тело", and "уход за
 * телом" tells them nothing they did not already know.
 */
export const AREA_HINTS: Record<CareArea, string> = {
  skin: "Очищение, тоник, сыворотка, крем, SPF",
  hair: "Мытьё, маски, масла, стрижка",
  teeth: "Чистка, нить, ирригатор, ополаскиватель",
  body: "Душ, скраб, лосьон, дезодорант",
  beard: "Мытьё, масло, триммер, форма",
  nails: "Стрижка, пилка, кутикула, крем для рук",
  custom: "Всё, что не попало в остальные разделы",
};

/**
 * Starter routines offered on an empty screen, per area.
 *
 * Not seeded into the database — these are prefilled drafts the form opens
 * with, so a first-time user gets a working evening routine in two taps
 * instead of an empty checklist and a blinking cursor. Everything stays
 * editable, and nothing exists until they save.
 */
export interface RoutinePreset {
  area: CareArea;
  title: string;
  timeOfDay: "morning" | "evening" | "any";
  steps: string[];
}

export const ROUTINE_PRESETS: RoutinePreset[] = [
  {
    area: "skin",
    title: "Утренний уход за кожей",
    timeOfDay: "morning",
    steps: ["Умывание", "Тоник", "Увлажняющий крем", "SPF"],
  },
  {
    area: "skin",
    title: "Вечерний уход за кожей",
    timeOfDay: "evening",
    steps: ["Снятие макияжа", "Умывание", "Сыворотка", "Ночной крем"],
  },
  {
    area: "teeth",
    title: "Уход за зубами",
    timeOfDay: "any",
    steps: ["Чистка щёткой", "Зубная нить", "Ополаскиватель"],
  },
  {
    area: "hair",
    title: "Уход за волосами",
    timeOfDay: "any",
    steps: ["Мытьё", "Кондиционер", "Сушка"],
  },
  {
    area: "body",
    title: "Уход за телом",
    timeOfDay: "evening",
    steps: ["Душ", "Лосьон для тела"],
  },
  {
    area: "beard",
    title: "Уход за бородой",
    timeOfDay: "any",
    steps: ["Мытьё", "Масло для бороды", "Расчёсывание"],
  },
  {
    area: "nails",
    title: "Уход за ногтями",
    timeOfDay: "any",
    steps: ["Подпилить", "Кутикула", "Крем для рук"],
  },
];

/** The presets worth offering to this profile — beard only where it applies. */
export function offeredPresets(gender: string): RoutinePreset[] {
  return ROUTINE_PRESETS.filter((preset) => isAreaOffered(preset.area, gender));
}
