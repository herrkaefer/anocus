import { signText } from "./utils.ts";

export interface GuestMeta {
  v: 1;
  name: string;
  email_hash?: string;
  sig: string;
}

const PREFIX = "<!-- anocus-meta:";
const PUBLIC_HEADER = "[Anocus Guest Comment]";

function stableMetaPayload(name: string, emailHash?: string): string {
  return JSON.stringify({ v: 1, name, email_hash: emailHash || "" });
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

export interface ParsedCommentBody {
  isGuest: boolean;
  guestName?: string;
  content: string;
}

export function composePublicCommentBody(name: string, comment: string): string {
  const lines = [PUBLIC_HEADER, `Name: ${name.trim()}`];
  lines.push("---");
  lines.push(comment);
  return lines.join("\n");
}

function parsePublicCommentBody(body: string): ParsedCommentBody | null {
  const normalized = body.replace(/\r\n/g, "\n").trimStart();
  if (!normalized.startsWith(PUBLIC_HEADER)) {
    return null;
  }

  const lines = normalized.split("\n");
  let name = "";
  let dividerIndex = -1;

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === "---") {
      dividerIndex = index;
      break;
    }
    if (line.toLowerCase().startsWith("name:")) {
      name = line.slice(5).trim();
      continue;
    }
  }

  if (dividerIndex < 0 || !name) {
    return null;
  }

  const content = lines.slice(dividerIndex + 1).join("\n").trim();
  return {
    isGuest: true,
    guestName: name,
    content,
  };
}

export async function parseStoredCommentBody(body: string, secret: string): Promise<ParsedCommentBody> {
  const publicParsed = parsePublicCommentBody(body);
  if (publicParsed) {
    return publicParsed;
  }

  const legacy = await parseMeta(body, secret);
  if (legacy.meta) {
    return {
      isGuest: true,
      guestName: legacy.meta.name,
      content: legacy.content.trim(),
    };
  }

  return {
    isGuest: false,
    content: body.trim(),
  };
}
