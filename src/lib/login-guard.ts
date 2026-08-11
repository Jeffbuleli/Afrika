/**
 * Progressive login lockout / delay (in-memory, single-container VPS).
 */

type FailBucket = {
  count: number;
  windowStart: number;
  lockedUntil: number;
};

const byIp = new Map<string, FailBucket>();
const byEmail = new Map<string, FailBucket>();

const WINDOW_MS = 15 * 60 * 1000;
const IP_LOCK_AFTER = 5;
const EMAIL_LOCK_AFTER = 8;
const LOCK_MS = 30 * 60 * 1000;

function touch(map: Map<string, FailBucket>, key: string): FailBucket {
  const now = Date.now();
  const existing = map.get(key);
  if (!existing || now - existing.windowStart > WINDOW_MS) {
    const fresh: FailBucket = { count: 0, windowStart: now, lockedUntil: 0 };
    map.set(key, fresh);
    return fresh;
  }
  return existing;
}

export function getLoginLockStatus(ip: string, email: string): {
  locked: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const ipB = touch(byIp, ip);
  const emB = touch(byEmail, email.toLowerCase());
  const until = Math.max(ipB.lockedUntil, emB.lockedUntil);
  if (until > now) {
    return { locked: true, retryAfterSec: Math.ceil((until - now) / 1000) };
  }
  return { locked: false, retryAfterSec: 0 };
}

/** Delay before answering a failed login (ms). */
export function loginFailureDelayMs(ip: string): number {
  const b = touch(byIp, ip);
  // 250ms, 500, 1s, 2s, 4s, 8s capped
  const exp = Math.min(8, Math.max(0, b.count));
  return Math.min(8000, 250 * 2 ** exp);
}

export function recordLoginFailure(ip: string, email: string): void {
  const now = Date.now();
  const ipB = touch(byIp, ip);
  ipB.count += 1;
  if (ipB.count >= IP_LOCK_AFTER) {
    ipB.lockedUntil = now + LOCK_MS;
  }

  const key = email.toLowerCase().trim();
  if (key) {
    const emB = touch(byEmail, key);
    emB.count += 1;
    if (emB.count >= EMAIL_LOCK_AFTER) {
      emB.lockedUntil = now + LOCK_MS;
    }
  }
}

export function clearLoginFailures(ip: string, email: string): void {
  byIp.delete(ip);
  byEmail.delete(email.toLowerCase().trim());
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
