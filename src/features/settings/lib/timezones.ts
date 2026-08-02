/**
 * The zones the picker offers.
 *
 * A curated list, not Intl.supportedValuesOf("timeZone") — that returns north
 * of 400 entries with names like "America/Argentina/Rio_Gallegos", which is a
 * search problem on a phone rather than a choice. This covers Russia's eleven
 * zones (the product's actual audience), the CIS capitals, and the handful of
 * places a Russian-speaking user is realistically in otherwise.
 *
 * The picker also accepts anything Intl can resolve (see timezoneSchema), so a
 * zone that is not on this list is not unreachable — it just is not offered.
 * A stored zone outside the list still renders: see zoneLabel below.
 */
export interface TimezoneOption {
  /** IANA identifier — what actually lands in Profile.timezone. */
  id: string;
  city: string;
  /** Which block it appears under in the picker. */
  group: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { id: "Europe/Kaliningrad", city: "Калининград", group: "Россия" },
  { id: "Europe/Moscow", city: "Москва", group: "Россия" },
  { id: "Europe/Samara", city: "Самара", group: "Россия" },
  { id: "Asia/Yekaterinburg", city: "Екатеринбург", group: "Россия" },
  { id: "Asia/Omsk", city: "Омск", group: "Россия" },
  { id: "Asia/Krasnoyarsk", city: "Красноярск", group: "Россия" },
  { id: "Asia/Irkutsk", city: "Иркутск", group: "Россия" },
  { id: "Asia/Yakutsk", city: "Якутск", group: "Россия" },
  { id: "Asia/Vladivostok", city: "Владивосток", group: "Россия" },
  { id: "Asia/Magadan", city: "Магадан", group: "Россия" },
  { id: "Asia/Kamchatka", city: "Камчатка", group: "Россия" },

  { id: "Europe/Minsk", city: "Минск", group: "СНГ" },
  { id: "Europe/Kyiv", city: "Киев", group: "СНГ" },
  { id: "Asia/Tbilisi", city: "Тбилиси", group: "СНГ" },
  { id: "Asia/Yerevan", city: "Ереван", group: "СНГ" },
  { id: "Asia/Baku", city: "Баку", group: "СНГ" },
  { id: "Asia/Almaty", city: "Алматы", group: "СНГ" },
  { id: "Asia/Tashkent", city: "Ташкент", group: "СНГ" },
  { id: "Asia/Bishkek", city: "Бишкек", group: "СНГ" },

  { id: "Europe/Lisbon", city: "Лиссабон", group: "Мир" },
  { id: "Europe/London", city: "Лондон", group: "Мир" },
  { id: "Europe/Berlin", city: "Берлин", group: "Мир" },
  { id: "Europe/Belgrade", city: "Белград", group: "Мир" },
  { id: "Europe/Istanbul", city: "Стамбул", group: "Мир" },
  { id: "Asia/Dubai", city: "Дубай", group: "Мир" },
  { id: "Asia/Bangkok", city: "Бангкок", group: "Мир" },
  { id: "Asia/Shanghai", city: "Шанхай", group: "Мир" },
  { id: "Asia/Tokyo", city: "Токио", group: "Мир" },
  { id: "America/New_York", city: "Нью-Йорк", group: "Мир" },
  { id: "America/Chicago", city: "Чикаго", group: "Мир" },
  { id: "America/Los_Angeles", city: "Лос-Анджелес", group: "Мир" },
  { id: "UTC", city: "UTC", group: "Мир" },
];

export const TIMEZONE_GROUPS = ["Россия", "СНГ", "Мир"] as const;

/**
 * The zone's current offset, written as "UTC+3".
 *
 * Computed rather than stored: half the world moves twice a year, and a table
 * of offsets is wrong for two weeks every spring in a way nobody notices until
 * a streak breaks. An unresolvable zone returns null and the caller drops the
 * suffix — the same "degrade, don't throw" policy dayInZone applies.
 */
export function zoneOffsetLabel(timezone: string, at: Date = new Date()): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    }).formatToParts(at);

    const name = parts.find((part) => part.type === "timeZoneName")?.value;
    if (!name) return null;

    // "GMT+03:00" -> "UTC+3", "GMT" -> "UTC+0". Minutes are kept only when
    // they are not zero, which is what makes Asia/Kolkata read as UTC+5:30.
    const match = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(name);
    if (!match) return null;

    const [, sign, hours, minutes] = match;
    if (!sign) return "UTC+0";

    const hour = Number(hours);
    return minutes === "00"
      ? `UTC${sign}${hour}`
      : `UTC${sign}${hour}:${minutes}`;
  } catch {
    return null;
  }
}

/** The local wall-clock time in a zone, "14:35". Null if the zone is unknown. */
export function zoneClock(timezone: string, at: Date = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(at);
  } catch {
    return null;
  }
}

/**
 * How a stored zone is named on the settings row.
 *
 * Falls back to the raw identifier for a zone outside the curated list — a
 * profile written before this list existed, or one set from another client,
 * must still show something truthful rather than an empty row.
 */
export function zoneLabel(timezone: string): string {
  const known = TIMEZONE_OPTIONS.find((option) => option.id === timezone);
  if (known) return known.city;
  // "Asia/Kolkata" -> "Kolkata" — the identifier minus its region prefix.
  return timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone;
}
