/**
 * Compare two secrets without leaking their contents through timing.
 *
 * A plain `===` returns as soon as two characters differ, so how long it took
 * to say "no" describes how much of the secret was right. Over one request
 * that is noise; over a few thousand it is a prefix, then the whole string.
 *
 * Shared rather than copied because there are now two doors using it — the
 * manual plan-activation endpoint and the support bot's webhook — and a
 * security primitive that exists twice is a primitive that gets fixed once.
 *
 * The early return on length is intentional and safe: a secret's length is not
 * the secret, and both call sites compare against a fixed-length value.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}
