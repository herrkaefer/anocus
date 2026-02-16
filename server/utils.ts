const encoder = new TextEncoder();

export function normalizePathname(pathname: string): string {
  const raw = (pathname || "").trim();
  if (!raw) return "/";
  let decoded = raw;
  try {
    decoded = decodeURI(raw);
  } catch {
    // Keep original when the input has malformed escape sequences.
  }

  const value = decoded.startsWith("/") ? decoded : `/${decoded}`;
  if (value.length > 1 && value.endsWith("/")) {
    return value.slice(0, -1);
  }
  return value;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function textOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bytesToHex(bytes: Uint8Array): string {
  let output = "";
  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, "0");
  }
  return output;
}

export async function sha256Hex(input: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return bytesToHex(new Uint8Array(hash));
}

export function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function getRemoteIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    request.headers.get("X-Real-IP") ||
    "unknown"
  );
}

export function trimBody(body: string): string {
  return body.replace(/\r\n/g, "\n").trim();
}
