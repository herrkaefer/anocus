import { sha256Hex, signText } from "./utils.ts";

export interface GuestMeta {
  v: 1;
  name: string;
  email_hash?: string;
  sig: string;
}

const PREFIX = "<!-- anocus-meta:";

function stableMetaPayload(name: string, emailHash?: string): string {
  return JSON.stringify({ v: 1, name, email_hash: emailHash || "" });
}

export async function buildMeta(name: string, email: string | undefined, secret: string): Promise<GuestMeta> {
  const normalizedName = name.trim();
  const normalizedEmail = (email || "").trim().toLowerCase();
  const emailHash = normalizedEmail ? await sha256Hex(normalizedEmail) : undefined;
  const payload = stableMetaPayload(normalizedName, emailHash);
  const sig = await signText(payload, secret);
  return {
    v: 1,
    name: normalizedName,
    email_hash: emailHash,
    sig,
  };
}

export function composeCommentBody(meta: GuestMeta, comment: string): string {
  return `${PREFIX}${JSON.stringify(meta)} -->\n${comment}`;
}

export async function parseMeta(body: string, secret: string): Promise<{ meta: GuestMeta | null; content: string }> {
  const trimmed = body.trimStart();
  if (!trimmed.startsWith(PREFIX)) {
    return { meta: null, content: body };
  }

  const end = trimmed.indexOf("-->");
  if (end < 0) {
    return { meta: null, content: body };
  }

  const rawJson = trimmed.slice(PREFIX.length, end).trim();
  const content = trimmed.slice(end + 3).trimStart();

  try {
    const parsed = JSON.parse(rawJson) as Partial<GuestMeta>;
    if (parsed.v !== 1 || typeof parsed.name !== "string" || typeof parsed.sig !== "string") {
      return { meta: null, content };
    }

    const payload = stableMetaPayload(parsed.name, parsed.email_hash);
    const expected = await signText(payload, secret);
    if (expected !== parsed.sig) {
      return { meta: null, content };
    }

    return {
      meta: {
        v: 1,
        name: parsed.name,
        email_hash: parsed.email_hash,
        sig: parsed.sig,
      },
      content,
    };
  } catch {
    return { meta: null, content };
  }
}
