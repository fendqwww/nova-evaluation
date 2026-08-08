import "server-only";
import { env } from "@/shared/config/env";

/**
 * Who is support.
 *
 * The roster is a comma-separated list of numeric Telegram ids in
 * SUPPORT_ADMIN_IDS, parsed once at boot (see shared/config/env.ts). Ids
 * rather than usernames on purpose: a username can be changed or released and
 * then claimed by someone else, and this list is the only thing standing
 * between a stranger and every ticket in the database.
 *
 * Checked on every privileged action — never inferred from which button was
 * tapped or which chat a message arrived in. Telegram hands callback_data back
 * verbatim from whoever pressed the button, so a forwarded ticket card is a
 * working "close this ticket" button in anyone's hands until the sender is
 * verified here.
 */

export function supportAdminIds(): readonly string[] {
  return env.SUPPORT_ADMIN_IDS;
}

export function isSupportAdmin(telegramId: string): boolean {
  return env.SUPPORT_ADMIN_IDS.includes(telegramId);
}

/** True when tickets would be created with nobody to route them to. */
export function hasNoAdmins(): boolean {
  return env.SUPPORT_ADMIN_IDS.length === 0;
}
