import "server-only";
import { z } from "zod";

/**
 * An optional secret that is allowed to be *written but blank*.
 *
 * A variable listed in .env with nothing after the `=` arrives as `""`, not as
 * undefined — so a plain `.min(16).optional()` would reject it and take the
 * whole app down at boot, which is exactly what a placeholder line in an env
 * file is supposed to avoid. Blank is normalised to "not configured", which is
 * the state every consumer of these already handles.
 *
 * The length floor still applies to anything actually filled in: these guard a
 * write endpoint, and a two-character secret is worse than an obvious blank
 * because it looks configured.
 */
const optionalSecret = (minLength: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(minLength).optional(),
  );

const envSchema = z.object({
  // Проверяется протокол, а не только непустота: самая вероятная ошибка при
  // первом деплое — забытая или скопированная из локальной разработки строка
  // вида `file:./prisma/dev.db`. С ней сборка проходила бы, а приложение
  // падало на первом запросе к базе где-то в глубине Prisma. Ошибка на старте
  // с готовым текстом дешевле молчаливо сломанного прода.
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((url) => url.startsWith("postgres://") || url.startsWith("postgresql://"), {
      message:
        "DATABASE_URL должен быть строкой PostgreSQL (postgres://…). Файловая база (file:…) на Vercel не работает: файловая система там только для чтения и живёт один запрос.",
    }),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  // Optional, not required: every AI feature (Coach, food analysis, appearance
  // analysis) has a defined behavior for "no key configured" — Coach falls
  // back to its deterministic composer, the two analysis actions return a
  // clear "AI unavailable" error — so a missing key degrades the app instead
  // of crashing its boot.
  GEMINI_API_KEY: z.string().min(1).optional(),
  // Guards the manual plan-activation endpoint (app/api/admin/activate-plan).
  // Optional, and the route 404s when it is unset: an admin door with no lock
  // must not exist at all, so a deploy that forgets this variable fails closed
  // rather than shipping an open one. Minimum length is a real constraint
  // here — this is the only secret in the app that grants paid tiers.
  ADMIN_SECRET: z.string().min(16).optional(),

  /* ------------------------------------------------------ support bot --- */

  // The support bot is a *second* bot, with its own token. It must not reuse
  // TELEGRAM_BOT_TOKEN above: that token signs the Mini App's initData, and
  // pointing a webhook at the same bot would put ticket traffic and the auth
  // surface behind one credential that cannot be rotated independently.
  //
  // Optional, like GEMINI_API_KEY and for the same reason: an unset token
  // means the webhook 404s and the app boots normally. Support degrades to
  // the t.me link, which still opens a chat.
  TELEGRAM_SUPPORT_BOT_TOKEN: optionalSecret(1),

  // Telegram echoes this back in the X-Telegram-Bot-Api-Secret-Token header on
  // every webhook delivery, and it is the only thing separating a real update
  // from anyone who guessed the URL. The webhook refuses to serve without it
  // for the same fail-closed reason ADMIN_SECRET 404s the admin route.
  TELEGRAM_WEBHOOK_SECRET: optionalSecret(16),

  // Comma-separated numeric Telegram ids. Everyone listed here receives new
  // tickets and may run the admin commands; everyone else talking to the bot
  // is a user opening one. Parsed to a frozen array once, at boot, so no
  // caller has to re-split a string and no caller can mutate the roster.
  //
  // Empty is valid and means "no admins configured": tickets are still stored,
  // they simply have nobody to notify. That is a misconfiguration worth
  // logging, not a reason to refuse to boot.
  SUPPORT_ADMIN_IDS: z
    .string()
    .optional()
    .transform((raw) =>
      Object.freeze(
        (raw ?? "")
          .split(",")
          .map((id) => id.trim())
          .filter((id) => /^\d+$/.test(id)),
      ),
    ),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  ADMIN_SECRET: process.env.ADMIN_SECRET,
  TELEGRAM_SUPPORT_BOT_TOKEN: process.env.TELEGRAM_SUPPORT_BOT_TOKEN,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
  SUPPORT_ADMIN_IDS: process.env.SUPPORT_ADMIN_IDS,
});
