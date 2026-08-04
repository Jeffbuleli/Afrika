type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  retryAfterSec: number;
  constructor(retryAfterSec: number) {
    super("RATE_LIMIT");
    this.name = "RateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

/**
 * Simple in-memory sliding window. Fine for a single-container VPS.
 * Throws RateLimitError when exceeded.
 */
export function assertRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): void {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (existing.count >= limit) {
    throw new RateLimitError(Math.ceil((existing.resetAt - now) / 1000));
  }
  existing.count += 1;
}
