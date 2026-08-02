"use server";

import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { buildExport } from "@/features/settings/server/settings.repository";
import type { ExportBundle } from "@/features/settings/types";

/** Bumped when the exported shape changes, so an old file stays identifiable. */
const EXPORT_VERSION = 1;

/**
 * The user's data, serialised once on the server.
 *
 * The JSON is built and stringified here rather than shipping raw rows for the
 * client to assemble: the shape is a promise made to whoever opens the file
 * later, and it belongs next to the queries that produce it. The client's only
 * job is to hand the string to a download.
 *
 * The filename carries the user's own calendar day, resolved from their
 * timezone — an export taken at 1am in Vladivostok should not be named with
 * yesterday's date because the server happens to be on UTC.
 *
 * Two spaces of indentation on purpose. This file is meant to be opened and
 * read by a person, and the size cost is irrelevant next to the photo bytes
 * that are deliberately not in it.
 */
export async function exportDataAction(
  rawInitData: string | undefined,
): Promise<ExportBundle> {
  const { userId, timezone } = await requireUserContext(rawInitData);

  const exportedAt = new Date();
  const data = await buildExport(userId);

  const json = JSON.stringify(
    { version: EXPORT_VERSION, exportedAt: exportedAt.toISOString(), ...data },
    null,
    2,
  );

  return {
    version: EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    json,
    filename: `nova-export-${todayIn(timezone)}.json`,
    // Byte length, not string length — the difference is large for Cyrillic,
    // and the number is shown to the user as a file size.
    sizeBytes: Buffer.byteLength(json, "utf8"),
  };
}
