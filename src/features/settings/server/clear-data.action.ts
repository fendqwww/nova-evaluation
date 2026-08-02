"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { clearScope, countScopes } from "@/features/settings/server/settings.repository";
import { clearScopeSchema } from "@/features/settings/schemas";
import type { ClearResult, ClearScope } from "@/features/settings/types";

const clearDataInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  scope: clearScopeSchema,
  /**
   * The count the user was shown when they confirmed.
   *
   * Not a security control — it is a guard against confirming a dialog that has
   * gone stale, which on a screen whose only button is irreversible is worth
   * one extra field. A mismatch is reported back so the dialog can re-ask with
   * the real number rather than deleting a different amount than was agreed to.
   */
  expected: z.number().int().min(0),
});

export type ClearDataInput = z.infer<typeof clearDataInputSchema>;

/**
 * Delete one section's history.
 *
 * Irreversible and scoped: what each scope covers is spelled out in
 * CLEAR_SCOPE_HINTS and enforced in clearScope, and nothing here widens it.
 * The returned count is what actually went, which is the only honest thing to
 * report after a destructive action — a success message with no number cannot
 * be checked against what the dialog promised.
 */
export async function clearDataAction(input: ClearDataInput): Promise<ClearResult> {
  const { rawInitData, scope, expected } = clearDataInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const current = (await countScopes(userId))[scope];
  if (current !== expected) throw new Error("CLEAR_COUNT_CHANGED");

  const removed = await clearScope(userId, scope);

  return { scope, removed };
}

/**
 * How much each scope holds right now.
 *
 * Fetched when the dialog opens rather than carried in the settings snapshot:
 * seven counts across six tables is real work for a screen that mostly is not
 * about deleting anything.
 */
export async function getClearCountsAction(
  rawInitData: string | undefined,
): Promise<Record<ClearScope, number>> {
  const userId = await requireUserId(rawInitData);
  return countScopes(userId);
}
