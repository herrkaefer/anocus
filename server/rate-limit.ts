import { RateLimitResult } from "./types.js";

interface IpWindow {
  lastPostAtMs: number;
  posts: number[];
}

const ipWindows = new Map<string, IpWindow>();

export function checkRateLimit(
  ip: string,
  minSecondsBetweenPosts: number,
  maxPostsPerHour: number,
  nowMs = Date.now(),
): RateLimitResult {
  const key = ip || "unknown";
  const window = ipWindows.get(key) || { lastPostAtMs: 0, posts: [] };

  const minGapMs = Math.max(0, minSecondsBetweenPosts) * 1000;
  if (window.lastPostAtMs > 0 && nowMs - window.lastPostAtMs < minGapMs) {
    return { ok: false, message: "Too many requests. Please wait a moment before posting again." };
  }

  const hourAgo = nowMs - 60 * 60 * 1000;
  window.posts = window.posts.filter((timestamp) => timestamp >= hourAgo);
  if (window.posts.length >= Math.max(1, maxPostsPerHour)) {
    return { ok: false, message: "Hourly post limit reached. Please try again later." };
  }

  window.lastPostAtMs = nowMs;
  window.posts.push(nowMs);
  ipWindows.set(key, window);

  // Best-effort cleanup for old keys.
  if (ipWindows.size > 5000) {
    for (const [k, value] of ipWindows.entries()) {
      if (value.posts.length === 0 || value.posts[value.posts.length - 1] < hourAgo) {
        ipWindows.delete(k);
      }
      if (ipWindows.size <= 2000) break;
    }
  }

  return { ok: true };
}
