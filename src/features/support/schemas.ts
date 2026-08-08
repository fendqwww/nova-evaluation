import { z } from "zod";
import { MAX_MESSAGE_LENGTH, MIN_MESSAGE_LENGTH } from "./constants";
import type { SupportCategoryId, SupportSessionStep, SupportTicketStatus } from "./types";

/* ------------------------------------------------------------ storage --- */

export const CATEGORY_IDS = [
  "app",
  "coach",
  "workouts",
  "reports",
  "billing",
  "bug",
  "human",
] as const satisfies readonly SupportCategoryId[];

export const TICKET_STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "ANSWERED",
  "CLOSED",
] as const satisfies readonly SupportTicketStatus[];

export const SESSION_STEPS = [
  "idle",
  "awaiting_message",
  "awaiting_screenshot",
  "awaiting_reply",
] as const satisfies readonly SupportSessionStep[];

export const categorySchema = z.enum(CATEGORY_IDS);
export const ticketStatusSchema = z.enum(TICKET_STATUSES);
export const sessionStepSchema = z.enum(SESSION_STEPS);

/**
 * A stored status, read back into the union.
 *
 * Unknown values degrade to "NEW" instead of throwing — the same rule the
 * settings module applies to its categorical columns. A row an older build
 * wrote must not be able to crash the queue that lists it.
 */
export function parseStatus(raw: string): SupportTicketStatus {
  const parsed = ticketStatusSchema.safeParse(raw);
  return parsed.success ? parsed.data : "NEW";
}

/** Same contract for the conversation step: unknown means "start over". */
export function parseStep(raw: string): SupportSessionStep {
  const parsed = sessionStepSchema.safeParse(raw);
  return parsed.success ? parsed.data : "idle";
}

/** Same contract for the category (see categoryById for the label side). */
export function parseCategory(raw: string | null): SupportCategoryId | null {
  if (raw === null) return null;
  const parsed = categorySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * The screenshots column: a JSON array of Telegram file_ids.
 *
 * Everything about this is defensive on purpose. It runs inside a webhook
 * handler, where a throw becomes a non-2xx response and Telegram retries the
 * same update — turning one malformed row into an infinite redelivery loop. A
 * screenshot list that cannot be read is better rendered as "no screenshots".
 */
export function parseScreenshots(raw: string): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function serializeScreenshots(ids: readonly string[]): string {
  return JSON.stringify(ids);
}

/** The description a user typed, as the ticket will store it. */
export const ticketMessageSchema = z
  .string()
  .trim()
  .min(MIN_MESSAGE_LENGTH)
  .max(MAX_MESSAGE_LENGTH);

/* ----------------------------------------------------------- telegram --- */

/*
 * A deliberately partial model of the Telegram Update object.
 *
 * Only the fields this bot reads are declared, and zod's default behaviour of
 * stripping unknown keys does the rest: Telegram adds fields to its payloads
 * regularly, and a schema that rejected them would break the bot on Telegram's
 * release schedule rather than on ours.
 *
 * Everything optional stays optional. The handlers branch on what is present
 * (message vs callback_query, text vs photo), so a narrower schema would only
 * move that branching into a parse failure.
 */

const telegramUserSchema = z.object({
  id: z.number().int(),
  is_bot: z.boolean().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
});

const telegramChatSchema = z.object({
  id: z.number().int(),
  type: z.string().optional(),
});

/**
 * One size of an uploaded photo. Telegram sends several; the last entry is the
 * largest, which is the one worth forwarding to support.
 */
const telegramPhotoSizeSchema = z.object({
  file_id: z.string(),
  file_unique_id: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  file_size: z.number().int().optional(),
});

const telegramMessageSchema = z.object({
  message_id: z.number().int(),
  from: telegramUserSchema.optional(),
  chat: telegramChatSchema,
  text: z.string().optional(),
  caption: z.string().optional(),
  photo: z.array(telegramPhotoSizeSchema).optional(),
  // An image sent "as a file" rather than compressed. Accepted because that is
  // how a careful bug reporter sends a screenshot, and rejecting it would look
  // like the bot ignoring them.
  document: z
    .object({
      file_id: z.string(),
      mime_type: z.string().optional(),
      file_name: z.string().optional(),
    })
    .optional(),
});

const telegramCallbackQuerySchema = z.object({
  id: z.string(),
  from: telegramUserSchema,
  message: telegramMessageSchema.optional(),
  data: z.string().optional(),
});

export const telegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: telegramMessageSchema.optional(),
  edited_message: telegramMessageSchema.optional(),
  callback_query: telegramCallbackQuerySchema.optional(),
});

export type TelegramUser = z.infer<typeof telegramUserSchema>;
export type TelegramMessage = z.infer<typeof telegramMessageSchema>;
export type TelegramCallbackQuery = z.infer<typeof telegramCallbackQuerySchema>;
export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
