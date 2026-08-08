import type { PlanId } from "@/features/settings/types";
import type { UsageFeature, UsageWindow } from "@/features/usage/constants";

/**
 * Where one feature's budget stands for one user, already resolved against
 * their tier.
 *
 * `used` and `limit` are always the *binding* window — the one that will refuse
 * the next call first — because that is the only pair a card or an error
 * message can honestly print. A FREE user with 0/5 for the month but 1/1 for
 * the week is out of food analyses, and showing "0 из 5" there would be a
 * counter that says yes while the server says no.
 */
export interface FeatureUsage {
  feature: UsageFeature;
  used: number;
  /** null means no ceiling on this feature for this tier. */
  limit: number | null;
  /** Which window `used`/`limit` describe. */
  window: UsageWindow;
  allowed: boolean;
  /**
   * When the binding window refills, as a CalendarDay in the user's own zone.
   * Null for an unlimited feature and for a lifetime allowance, which is the
   * distinction that keeps "вернётся 1 сентября" out of a message about an
   * allowance that never comes back.
   */
  renewsOn: string | null;
}

/** Every counter for one user, as the settings screen renders them. */
export interface UsageSnapshot {
  plan: PlanId;
  /** "YYYY-MM" of the user's local month these counters belong to. */
  periodMonth: string;
  coach: FeatureUsage;
  food: FeatureUsage;
  appearance: FeatureUsage;
}

/**
 * The answer to "may this call happen, and has it now been paid for?".
 *
 * A discriminated result rather than a thrown error: this crosses a server
 * action boundary, and Next.js redacts a thrown Error's message in production —
 * which would turn the one sentence explaining *why* the request was refused
 * into "An error occurred in the Server Components render".
 *
 * `message` is written server-side rather than composed in each component, so
 * the three surfaces that can hit a limit say the same thing about the same
 * ceiling.
 */
export type UsageDenied = {
  success: false;
  reason: "LIMIT_REACHED";
  message: string;
  feature: UsageFeature;
  used: number;
  limit: number;
  window: UsageWindow;
  renewsOn: string | null;
};

export type UsageGranted = { success: true };

export type ConsumeResult = UsageGranted | UsageDenied;
