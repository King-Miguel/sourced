import "server-only";
import { ASK_RATE_LIMIT_MAX_REQUESTS, ASK_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

// Simple in-memory, fixed-window rate limiter. Good enough for a single-
// instance dev/demo deployment and costs nothing to run. If this ever runs
// across multiple serverless instances, swap this module for Upstash Redis
// (or any shared store) without changing the call sites below.

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(
  key: string,
  max: number = ASK_RATE_LIMIT_MAX_REQUESTS,
  windowMs: number = ASK_RATE_LIMIT_WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: windowMs - (now - bucket.windowStart),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count, retryAfterMs: 0 };
}

/** Best-effort client identifier for rate limiting without auth yet. */
export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}
