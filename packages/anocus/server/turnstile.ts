import { TurnstileResult } from "./types.ts";

interface TurnstileResponse {
  success?: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp: string,
  secretKey: string | undefined,
): Promise<TurnstileResult> {
  if (!secretKey) {
    return { ok: true };
  }
  if (!token || token.trim().length === 0) {
    return { ok: false, message: "Missing Turnstile token" };
  }

  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
    remoteip: remoteIp,
  });

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await response.json()) as TurnstileResponse;
  if (!response.ok || json.success !== true) {
    const errors = (json["error-codes"] || []).join(", ");
    return { ok: false, message: errors || "Turnstile verification failed" };
  }

  return { ok: true };
}
