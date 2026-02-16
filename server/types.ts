export type StorageBackend = "github" | "kv";

export interface ThreadRef {
  id: string;
  title: string;
  url?: string;
  provider: StorageBackend;
}

export interface AuthorRef {
  kind: "guest" | "github";
  name: string;
  avatarUrl?: string;
  profileUrl?: string;
}

export interface PublicComment {
  id: string;
  parentId?: string;
  content: string;
  createdAt: string;
  author: AuthorRef;
}

export interface ThreadResponse {
  ok: true;
  provider: StorageBackend;
  thread: ThreadRef | null;
  comments: PublicComment[];
}

export interface CommentInput {
  pathname: string;
  pageTitle: string;
  guestName: string;
  content: string;
  parentCommentId?: string;
  remoteIp?: string;
}

export interface CommentResponse {
  ok: true;
  provider: StorageBackend;
  thread: ThreadRef;
  comment: PublicComment;
}

export interface StorageAdapter {
  provider: StorageBackend;
  getThreadByPath(pathname: string): Promise<ThreadRef | null>;
  ensureThread(pathname: string, pageTitle: string): Promise<ThreadRef>;
  listComments(thread: ThreadRef): Promise<PublicComment[]>;
  createComment(
    thread: ThreadRef,
    body: string,
    guestName: string,
    parentCommentId?: string,
  ): Promise<PublicComment>;
}

export interface AnocusConfig {
  storageBackend: StorageBackend;
  turnstileSecretKey?: string;
  allowedOrigin?: string;
  maxCommentLength: number;
  minSecondsBetweenPosts: number;
  maxPostsPerHour: number;
}

export interface AnocusRequestEnv {
  ANOCUS_STORAGE_BACKEND?: string;
  ANOCUS_TURNSTILE_REQUIRED?: string;
  ANOCUS_TURNSTILE_SECRET_KEY?: string;
  ANOCUS_ALLOWED_ORIGIN?: string;
  ANOCUS_MAX_COMMENT_LENGTH?: string;
  ANOCUS_MIN_SECONDS_BETWEEN_POSTS?: string;
  ANOCUS_MAX_POSTS_PER_HOUR?: string;
  ANOCUS_GITHUB_TOKEN?: string;
  ANOCUS_GITHUB_REPO_OWNER?: string;
  ANOCUS_GITHUB_REPO_NAME?: string;
  ANOCUS_GITHUB_CATEGORY_ID?: string;
  ANOCUS_GITHUB_CATEGORY_NAME?: string;
  ANOCUS_KV?: KVNamespace;
}

export interface TurnstileResult {
  ok: boolean;
  message?: string;
}

export interface RateLimitResult {
  ok: boolean;
  message?: string;
}
