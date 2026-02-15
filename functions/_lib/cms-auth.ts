export interface CmsEnv {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  CMS_ALLOWED_USERS?: string;
  CMS_SESSION_SECRET?: string;
  CMS_OAUTH_SCOPES?: string;
}

interface SignedStatePayload {
  state: string;
  exp: number;
}

interface SessionPayload {
  token: string;
  login: string;
  exp: number;
}

type SameSiteMode = "Lax" | "Strict" | "None";

interface CookieOptions {
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: SameSiteMode;
  maxAge?: number;
  expires?: Date;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const STATE_COOKIE_NAME = "cms_oauth_state";
export const SESSION_COOKIE_NAME = "cms_session";
export const STATE_TTL_SECONDS = 10 * 60;
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

const DEFAULT_SCOPE = "repo,user";

export function getRequiredEnv(env: CmsEnv, key: keyof CmsEnv): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOAuthScopes(env: CmsEnv): string {
  return (env.CMS_OAUTH_SCOPES || DEFAULT_SCOPE).trim();
}

export function parseAllowedUsers(env: CmsEnv): Set<string> {
  const value = (env.CMS_ALLOWED_USERS || "").trim();
  if (!value) {
    return new Set();
  }

  return new Set(
    value
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isSecureRequest(request: Request): boolean {
  const url = new URL(request.url);
  return url.protocol === "https:";
}

export function isValidProvider(provider: string | null): boolean {
  return provider === null || provider === "" || provider === "github";
}

export function randomHex(bytes = 16): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let hex = "";
  for (let index = 0; index < data.length; index += 1) {
    hex += data[index].toString(16).padStart(2, "0");
  }
  return hex;
}

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("Cookie");
  if (!header) {
    return {};
  }

  const cookies: Record<string, string> = {};
  const pairs = header.split(";");
  for (const rawPair of pairs) {
    const pair = rawPair.trim();
    if (!pair) continue;
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex < 1) continue;
    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${Math.trunc(options.maxAge)}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  parts.push(`Path=${options.path || "/"}`);
  if (options.httpOnly) {
    parts.push("HttpOnly");
  }
  if (options.secure) {
    parts.push("Secure");
  }
  parts.push(`SameSite=${options.sameSite || "Lax"}`);
  return parts.join("; ");
}

export function clearCookie(name: string, path = "/api", secure = false): string {
  return serializeCookie(name, "", {
    path,
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    secure,
    sameSite: "Lax",
  });
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(input: string): Uint8Array | null {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = normalized.length % 4;
  const padding = remainder === 0 ? "" : "=".repeat(4 - remainder);
  try {
    const decoded = atob(`${normalized}${padding}`);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function base64UrlEncodeUtf8(value: string): string {
  return bytesToBase64Url(encoder.encode(value));
}

function base64UrlDecodeUtf8(value: string): string | null {
  const bytes = base64UrlToBytes(value);
  if (!bytes) return null;
  try {
    return decoder.decode(bytes);
  } catch {
    return null;
  }
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function signValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function createSignedToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const encoded = base64UrlEncodeUtf8(JSON.stringify(payload));
  const signature = await signValue(encoded, secret);
  return `${encoded}.${signature}`;
}

async function readSignedToken<T>(token: string, secret: string): Promise<T | null> {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = await signValue(encoded, secret);
  if (!timingSafeEqual(signature, expected)) {
    return null;
  }

  const decoded = base64UrlDecodeUtf8(encoded);
  if (!decoded) {
    return null;
  }

  try {
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

export function buildGitHubAuthorizeUrl(origin: string, clientId: string, scope: string, state: string): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${origin}/api/callback`);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export async function exchangeCodeForToken(
  code: string,
  origin: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: `${origin}/api/callback`,
  });

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await response.json()) as Record<string, unknown>;
  const accessToken = json.access_token;
  if (!response.ok || typeof accessToken !== "string" || accessToken.length === 0) {
    const error = typeof json.error === "string" ? json.error : "token_exchange_failed";
    throw new Error(`GitHub OAuth failed: ${error}`);
  }
  return accessToken;
}

export async function fetchGitHubLogin(token: string): Promise<string> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "herrkaefer-cms-auth",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  const json = (await response.json()) as Record<string, unknown>;
  const login = json.login;
  if (!response.ok || typeof login !== "string" || login.length === 0) {
    throw new Error("Unable to fetch GitHub user profile");
  }
  return login.toLowerCase();
}

export function buildOAuthCallbackHtml(status: "success" | "error", payload: Record<string, unknown>): string {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Authorizing CMS</title>
  </head>
  <body>
    <p>Authorizing CMS...</p>
    <script>
      (function () {
        function receiveMessage() {
          if (window.opener) {
            window.opener.postMessage(${JSON.stringify(message)}, "*");
          }
          window.removeEventListener("message", receiveMessage, false);
          window.close();
        }

        window.addEventListener("message", receiveMessage, false);
        if (window.opener) {
          window.opener.postMessage("authorizing:github", "*");
        }
      })();
    </script>
  </body>
</html>`;
}

export async function createStateCookieValue(state: string, secret: string): Promise<string> {
  return createSignedToken(
    {
      state,
      exp: Date.now() + STATE_TTL_SECONDS * 1000,
    },
    secret,
  );
}

export async function verifyStateCookieValue(cookieValue: string, secret: string): Promise<SignedStatePayload | null> {
  const payload = await readSignedToken<SignedStatePayload>(cookieValue, secret);
  if (!payload) return null;
  if (typeof payload.state !== "string") return null;
  if (typeof payload.exp !== "number") return null;
  if (payload.exp < Date.now()) return null;
  return payload;
}

export async function createSessionCookieValue(token: string, login: string, secret: string): Promise<string> {
  return createSignedToken(
    {
      token,
      login,
      exp: Date.now() + SESSION_TTL_SECONDS * 1000,
    },
    secret,
  );
}

export async function readSessionFromRequest(request: Request, secret: string): Promise<SessionPayload | null> {
  const cookies = parseCookies(request);
  const rawSession = cookies[SESSION_COOKIE_NAME];
  if (!rawSession) {
    return null;
  }

  const payload = await readSignedToken<SessionPayload>(rawSession, secret);
  if (!payload) return null;
  if (typeof payload.token !== "string" || payload.token.length === 0) return null;
  if (typeof payload.login !== "string" || payload.login.length === 0) return null;
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;

  return payload;
}
