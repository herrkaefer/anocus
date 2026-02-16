import { composePublicCommentBody, parseStoredCommentBody } from "./meta.ts";
import { PublicComment, StorageAdapter, ThreadRef } from "./types.ts";
import { normalizePathname, nowIso, sha256Hex, trimBody } from "./utils.ts";

interface KvThreadRecord {
  id: string;
  pathname: string;
  title: string;
  createdAt: string;
}

interface KvCommentRecord {
  id: string;
  threadId: string;
  parentId?: string;
  createdAt: string;
  body: string;
}

interface KvEnv {
  ANOCUS_KV?: KVNamespace;
}

function ensureKv(env: KvEnv): KVNamespace {
  if (!env.ANOCUS_KV) {
    throw new Error("Missing KV binding: ANOCUS_KV");
  }
  return env.ANOCUS_KV;
}

export class KvStorageAdapter implements StorageAdapter {
  provider = "kv" as const;
  private kv: KVNamespace;
  private hmacSecret: string;

  constructor(env: KvEnv, hmacSecret: string) {
    this.kv = ensureKv(env);
    this.hmacSecret = hmacSecret;
  }

  private async threadKey(pathname: string): Promise<string> {
    const normalized = normalizePathname(pathname);
    const hash = await sha256Hex(normalized);
    return `anocus:v1:thread:${hash}`;
  }

  private commentPrefix(threadId: string): string {
    return `anocus:v1:comment:${threadId}:`;
  }

  async getThreadByPath(pathname: string): Promise<ThreadRef | null> {
    const key = await this.threadKey(pathname);
    const record = await this.kv.get<KvThreadRecord>(key, "json");
    if (!record) return null;

    return {
      id: record.id,
      title: record.pathname,
      provider: "kv",
    };
  }

  async ensureThread(pathname: string, pageTitle: string): Promise<ThreadRef> {
    const normalized = normalizePathname(pathname);
    const key = await this.threadKey(normalized);
    const existing = await this.kv.get<KvThreadRecord>(key, "json");
    if (existing) {
      return {
        id: existing.id,
        title: existing.pathname,
        provider: "kv",
      };
    }

    const createdAt = nowIso();
    const id = crypto.randomUUID();
    const record: KvThreadRecord = {
      id,
      pathname: normalized,
      title: pageTitle || normalized,
      createdAt,
    };

    await this.kv.put(key, JSON.stringify(record));

    return {
      id,
      title: normalized,
      provider: "kv",
    };
  }

  async listComments(thread: ThreadRef): Promise<PublicComment[]> {
    const prefix = this.commentPrefix(thread.id);
    let cursor: string | undefined;
    const comments: PublicComment[] = [];

    do {
      const result = await this.kv.list({
        prefix,
        cursor,
        limit: 100,
      });

      cursor = result.list_complete ? undefined : result.cursor;
      for (const key of result.keys) {
        const record = await this.kv.get<KvCommentRecord>(key.name, "json");
        if (!record) continue;

        const parsed = await parseStoredCommentBody(record.body, this.hmacSecret);
        comments.push({
          id: record.id,
          parentId: record.parentId,
          content: trimBody(parsed.content),
          createdAt: record.createdAt,
          author: {
            kind: "guest",
            name: parsed.guestName || "guest",
            email: parsed.guestEmail,
          },
        });
      }
    } while (cursor);

    return comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createComment(
    thread: ThreadRef,
    body: string,
    guestName: string,
    guestEmail?: string,
    parentCommentId?: string,
  ): Promise<PublicComment> {
    const content = trimBody(body);
    const createdAt = nowIso();
    const id = crypto.randomUUID();
    const mergedBody = composePublicCommentBody(guestName, guestEmail, content);

    const timestamp = new Date(createdAt).getTime().toString().padStart(16, "0");
    const key = `${this.commentPrefix(thread.id)}${timestamp}:${id}`;
    const record: KvCommentRecord = {
      id,
      threadId: thread.id,
      parentId: parentCommentId || undefined,
      createdAt,
      body: mergedBody,
    };

    await this.kv.put(key, JSON.stringify(record));

    return {
      id,
      parentId: parentCommentId || undefined,
      content,
      createdAt,
      author: {
        kind: "guest",
        name: guestName,
        email: (guestEmail || "").trim() || undefined,
      },
    };
  }
}
