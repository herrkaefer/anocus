import { GitHubDiscussionsAdapter } from "./github.ts";
import { KvStorageAdapter } from "./kv.ts";
import { checkRateLimit } from "./rate-limit.ts";
import {
  AnocusConfig,
  AnocusRequestEnv,
  CommentInput,
  CommentResponse,
  StorageAdapter,
  ThreadResponse,
} from "./types.ts";
import { normalizeGuestLink, normalizePathname, toInt, trimBody } from "./utils.ts";
import { verifyTurnstileToken } from "./turnstile.ts";

export function readConfig(env: AnocusRequestEnv): AnocusConfig {
  const backend = (env.ANOCUS_STORAGE_BACKEND || "github").trim().toLowerCase();
  if (backend !== "github" && backend !== "kv") {
    throw new Error("ANOCUS_STORAGE_BACKEND must be github or kv");
  }

  return {
    storageBackend: backend,
    turnstileSecretKey: env.ANOCUS_TURNSTILE_SECRET_KEY,
    allowedOrigin: env.ANOCUS_ALLOWED_ORIGIN,
    maxCommentLength: toInt(env.ANOCUS_MAX_COMMENT_LENGTH, 5000),
    minSecondsBetweenPosts: toInt(env.ANOCUS_MIN_SECONDS_BETWEEN_POSTS, 20),
    maxPostsPerHour: toInt(env.ANOCUS_MAX_POSTS_PER_HOUR, 20),
  };
}

export function createAdapter(env: AnocusRequestEnv, config: AnocusConfig): StorageAdapter {
  if (config.storageBackend === "kv") {
    return new KvStorageAdapter(env);
  }
  return new GitHubDiscussionsAdapter(env);
}

export class AnocusService {
  private config: AnocusConfig;
  private adapter: StorageAdapter;

  constructor(env: AnocusRequestEnv) {
    this.config = readConfig(env);
    this.adapter = createAdapter(env, this.config);
  }

  async loadThread(pathname: string): Promise<ThreadResponse> {
    const normalized = normalizePathname(pathname);
    const thread = await this.adapter.getThreadByPath(normalized);
    const comments = thread ? await this.adapter.listComments(thread) : [];
    return {
      ok: true,
      provider: this.adapter.provider,
      thread,
      comments,
    };
  }

  async createComment(input: CommentInput, turnstileToken: string): Promise<CommentResponse> {
    const pathname = normalizePathname(input.pathname);
    const guestName = input.guestName.trim();
    const guestLink = normalizeGuestLink(input.guestLink || "");
    if (!guestName) {
      throw new Error("Guest name is required");
    }

    const content = trimBody(input.content);
    if (!content) {
      throw new Error("Comment content is required");
    }
    if (content.length > this.config.maxCommentLength) {
      throw new Error(`Comment is too long (max ${this.config.maxCommentLength} chars)`);
    }

    const linkCount = (content.match(/https?:\/\//g) || []).length;
    if (linkCount > 3) {
      throw new Error("Too many links in one comment");
    }

    const rateLimit = checkRateLimit(
      input.remoteIp || "unknown",
      this.config.minSecondsBetweenPosts,
      this.config.maxPostsPerHour,
    );
    if (!rateLimit.ok) {
      throw new Error(rateLimit.message || "Rate limited");
    }

    const turnstile = await verifyTurnstileToken(
      turnstileToken,
      input.remoteIp || "unknown",
      this.config.turnstileSecretKey,
    );
    if (!turnstile.ok) {
      throw new Error(turnstile.message || "Turnstile validation failed");
    }

    const thread = await this.adapter.ensureThread(pathname, input.pageTitle);
    const comment = await this.adapter.createComment(thread, content, guestName, guestLink, input.parentCommentId);

    return {
      ok: true,
      provider: this.adapter.provider,
      thread,
      comment,
    };
  }

  ensureOriginAllowed(origin: string | null): boolean {
    if (!this.config.allowedOrigin) {
      return true;
    }
    if (!origin) {
      return true;
    }
    return origin === this.config.allowedOrigin;
  }
}
