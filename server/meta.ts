const PUBLIC_HEADER = "[Anocus Comment]";

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

export function parseStoredCommentBody(body: string): ParsedCommentBody {
  const publicParsed = parsePublicCommentBody(body);
  if (publicParsed) {
    return publicParsed;
  }

  return {
    isGuest: false,
    content: body.trim(),
  };
}
