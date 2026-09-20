/**
 * Small in-process rate limiter (sliding window per key). Good enough for one instance; a second
 * replica would need a shared store. Used where a public endpoint could be hammered (password
 * reset requests).
 */

const hits = new Map<string, number[]>();
let lastPrune = Date.now();

function prune(now: number, windowMs: number) {
  if (now - lastPrune < windowMs) return;
  lastPrune = now;
  for (const [key, times] of hits) {
    const kept = times.filter((t) => now - t < windowMs);
    if (kept.length) hits.set(key, kept);
    else hits.delete(key);
  }
}

/** True when `key` has been seen fewer than `limit` times in the last `windowMs`; records the hit. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  return charge(key, 1, limit, windowMs);
}

/**
 * Like `allow`, for work that counts more than once (a resolve request with twelve places).
 * Records `amount` hits when they fit under `limit`, none when they would not.
 */
export function charge(key: string, amount: number, limit: number, windowMs: number): boolean {
  const now = Date.now();
  prune(now, windowMs);
  const times = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  const n = Math.max(0, Math.round(amount));
  if (times.length + n > limit) {
    hits.set(key, times);
    return false;
  }
  for (let i = 0; i < n; i++) times.push(now);
  hits.set(key, times);
  return true;
}

/** The caller's address behind Railway's proxy (first forwarded hop), or "local". */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "local";
  return request.headers.get("x-real-ip") ?? "local";
}
