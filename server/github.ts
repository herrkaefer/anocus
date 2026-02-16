import { composePublicCommentBody, parseStoredCommentBody } from "./meta.ts";
import { PublicComment, StorageAdapter, ThreadRef } from "./types.ts";
import { normalizePathname, trimBody } from "./utils.ts";

interface GitHubAuthor {
  login?: string;
  avatarUrl?: string;
  url?: string;
}

interface GitHubDiscussionNode {
  id: string;
  number: number;
  title: string;
  url?: string;
  body?: string;
}

interface GitHubReplyRef {
  id: string;
}

interface GitHubCommentNode {
  id: string;
  body: string;
  createdAt: string;
  author?: GitHubAuthor;
  replyTo?: GitHubReplyRef | null;
  replies?: {
    nodes?: GitHubCommentNode[];
  };
}

interface GitHubEnv {
  ANOCUS_GITHUB_TOKEN?: string;
  ANOCUS_GITHUB_REPO_OWNER?: string;
  ANOCUS_GITHUB_REPO_NAME?: string;
  ANOCUS_GITHUB_CATEGORY_ID?: string;
  ANOCUS_GITHUB_CATEGORY_NAME?: string;
}

interface RepoInfo {
  id: string;
  categoryId: string;
  nameWithOwner: string;
}

function assertRequired(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function threadRefFromDiscussion(node: GitHubDiscussionNode): ThreadRef {
  return {
    id: node.id,
    title: node.title,
    url: node.url,
    provider: "github",
  };
}

function pathnameCandidates(pathname: string): Set<string> {
  const normalized = normalizePathname(pathname);
  const set = new Set<string>();
  set.add(normalized);
  try {
    set.add(encodeURI(normalized));
  } catch {
    // ignore encode failures
  }
  set.add(normalized.endsWith("/") ? normalized.slice(0, -1) || "/" : `${normalized}/`);
  if (normalized.startsWith("/")) {
    set.add(normalized.slice(1));
  }
  try {
    set.add(decodeURI(normalized));
  } catch {
    // ignore decode failures
  }
  return set;
}

export class GitHubDiscussionsAdapter implements StorageAdapter {
  provider = "github" as const;
  private token: string;
  private owner: string;
  private repo: string;
  private categoryId?: string;
  private categoryName?: string;
  private repoInfoCache: RepoInfo | null = null;

  constructor(env: GitHubEnv) {
    this.token = assertRequired(env.ANOCUS_GITHUB_TOKEN, "ANOCUS_GITHUB_TOKEN");
    this.owner = assertRequired(env.ANOCUS_GITHUB_REPO_OWNER, "ANOCUS_GITHUB_REPO_OWNER");
    this.repo = assertRequired(env.ANOCUS_GITHUB_REPO_NAME, "ANOCUS_GITHUB_REPO_NAME");
    this.categoryId = env.ANOCUS_GITHUB_CATEGORY_ID;
    this.categoryName = env.ANOCUS_GITHUB_CATEGORY_NAME;
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        "User-Agent": "anocus",
      },
      body: JSON.stringify({ query, variables }),
    });

    const payload = (await response.json()) as {
      data?: T;
      errors?: Array<{ message?: string }>;
    };

    if (!response.ok || payload.errors?.length || !payload.data) {
      const message = payload.errors?.map((entry) => entry.message).filter(Boolean).join("; ");
      throw new Error(message || "GitHub GraphQL request failed");
    }

    return payload.data;
  }

  private async getRepoInfo(): Promise<RepoInfo> {
    if (this.repoInfoCache) {
      return this.repoInfoCache;
    }

    const query = `
      query RepoInfo($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
          discussionCategories(first: 50) {
            nodes {
              id
              name
            }
          }
        }
      }
    `;

    const data = await this.graphql<{
      repository?: {
        id: string;
        discussionCategories?: { nodes?: Array<{ id: string; name: string }> };
      };
    }>(query, { owner: this.owner, name: this.repo });

    const repository = data.repository;
    if (!repository?.id) {
      throw new Error("GitHub repository not found");
    }

    let resolvedCategoryId = this.categoryId;
    if (!resolvedCategoryId && this.categoryName) {
      const nodes = repository.discussionCategories?.nodes || [];
      const category = nodes.find((node) => node.name.toLowerCase() === this.categoryName?.toLowerCase());
      resolvedCategoryId = category?.id;
    }

    if (!resolvedCategoryId) {
      throw new Error("Missing discussion category. Set ANOCUS_GITHUB_CATEGORY_ID or ANOCUS_GITHUB_CATEGORY_NAME.");
    }

    this.repoInfoCache = {
      id: repository.id,
      categoryId: resolvedCategoryId,
      nameWithOwner: `${this.owner}/${this.repo}`,
    };

    return this.repoInfoCache;
  }

  async getThreadByPath(pathname: string): Promise<ThreadRef | null> {
    const repoInfo = await this.getRepoInfo();
    const candidates = Array.from(pathnameCandidates(pathname));

    const query = `
      query SearchDiscussions($query: String!) {
        search(type: DISCUSSION, first: 10, query: $query) {
          nodes {
            ... on Discussion {
              id
              number
              title
              body
              url
              repository {
                nameWithOwner
              }
              category {
                id
              }
            }
          }
        }
      }
    `;

    for (const candidate of candidates) {
      const searchQuery = `repo:${repoInfo.nameWithOwner} is:discussion in:title \"${candidate}\"`;
      const data = await this.graphql<{
        search?: {
          nodes?: Array<
            GitHubDiscussionNode & {
              repository?: { nameWithOwner?: string };
              category?: { id?: string };
            }
          >;
        };
      }>(query, { query: searchQuery });

      const nodes = data.search?.nodes || [];
      for (const node of nodes) {
        if (node.repository?.nameWithOwner !== repoInfo.nameWithOwner) {
          continue;
        }
        if (node.category?.id !== repoInfo.categoryId) {
          continue;
        }
        if (pathnameCandidates(node.title).has(candidate)) {
          return threadRefFromDiscussion(node);
        }

        const markerMatch = node.body?.match(/anocus-path:\s*([^\n]+)/);
        if (markerMatch && pathnameCandidates(markerMatch[1].trim()).has(candidate)) {
          return threadRefFromDiscussion(node);
        }
      }
    }

    return null;
  }

  async ensureThread(pathname: string, pageTitle: string): Promise<ThreadRef> {
    const normalizedPath = normalizePathname(pathname);
    const existing = await this.getThreadByPath(normalizedPath);
    if (existing) return existing;

    const repoInfo = await this.getRepoInfo();
    const mutation = `
      mutation CreateDiscussion($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
        createDiscussion(input: {
          repositoryId: $repositoryId,
          categoryId: $categoryId,
          title: $title,
          body: $body
        }) {
          discussion {
            id
            number
            title
            url
          }
        }
      }
    `;

    const body = `Anocus thread for: ${pageTitle || normalizedPath}\n\n<!-- anocus-path: ${normalizedPath} -->`;
    const data = await this.graphql<{
      createDiscussion?: {
        discussion?: GitHubDiscussionNode;
      };
    }>(mutation, {
      repositoryId: repoInfo.id,
      categoryId: repoInfo.categoryId,
      title: normalizedPath,
      body,
    });

    const node = data.createDiscussion?.discussion;
    if (!node) {
      throw new Error("Unable to create discussion thread");
    }

    return threadRefFromDiscussion(node);
  }

  async listComments(thread: ThreadRef): Promise<PublicComment[]> {
    const comments: PublicComment[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const query = `
        query ListComments($discussionId: ID!, $cursor: String) {
          node(id: $discussionId) {
            ... on Discussion {
              comments(first: 100, after: $cursor) {
                nodes {
                  id
                  body
                  createdAt
                  replyTo {
                    id
                  }
                  author {
                    login
                    avatarUrl
                    url
                  }
                  replies(first: 100) {
                    nodes {
                      id
                      body
                      createdAt
                      replyTo {
                        id
                      }
                      author {
                        login
                        avatarUrl
                        url
                      }
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      `;

      const data = await this.graphql<{
        node?: {
          comments?: {
            nodes?: GitHubCommentNode[];
            pageInfo?: { hasNextPage: boolean; endCursor: string | null };
          };
        };
      }>(query, {
        discussionId: thread.id,
        cursor,
      });

      const commentNodes = data.node?.comments?.nodes || [];
      for (const node of commentNodes) {
        const parsed = parseStoredCommentBody(node.body);
        if (parsed) {
          comments.push(this.toPublicComment(node, parsed, node.replyTo?.id || undefined));
        }
        const replies = node.replies?.nodes || [];
        for (const reply of replies) {
          const replyParsed = parseStoredCommentBody(reply.body);
          if (replyParsed) {
            comments.push(this.toPublicComment(reply, replyParsed, reply.replyTo?.id || node.id));
          }
        }
      }

      hasNextPage = data.node?.comments?.pageInfo?.hasNextPage || false;
      cursor = data.node?.comments?.pageInfo?.endCursor || null;
      if (comments.length >= 1000) {
        break;
      }
    }

    return comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  private toPublicComment(
    node: GitHubCommentNode,
    parsed: { guestName: string; guestLink?: string; content: string },
    parentId?: string,
  ): PublicComment {
    return {
      id: node.id,
      parentId,
      content: parsed.content,
      createdAt: node.createdAt,
      author: {
        kind: "guest",
        name: parsed.guestName || "guest",
        profileUrl: parsed.guestLink,
      },
    };
  }

  async createComment(
    thread: ThreadRef,
    body: string,
    guestName: string,
    guestLink?: string,
    parentCommentId?: string,
  ): Promise<PublicComment> {
    const content = trimBody(body);
    const mergedBody = composePublicCommentBody(guestName, content, guestLink);
    const mutation = `
      mutation AddDiscussionComment($discussionId: ID!, $body: String!, $replyToId: ID) {
        addDiscussionComment(input: {discussionId: $discussionId, body: $body, replyToId: $replyToId}) {
          comment {
            id
            createdAt
            replyTo {
              id
            }
          }
        }
      }
    `;

    const data = await this.graphql<{
      addDiscussionComment?: {
        comment?: {
          id: string;
          createdAt: string;
          replyTo?: { id: string } | null;
        };
      };
    }>(mutation, {
      discussionId: thread.id,
      body: mergedBody,
      replyToId: parentCommentId || null,
    });
    const node = data.addDiscussionComment?.comment;

    if (!node) {
      throw new Error("Unable to create discussion comment");
    }

    return {
      id: node.id,
      parentId: node.replyTo?.id || parentCommentId || undefined,
      content,
      createdAt: node.createdAt,
      author: {
        kind: "guest",
        name: guestName,
        profileUrl: guestLink,
      },
    };
  }
}
