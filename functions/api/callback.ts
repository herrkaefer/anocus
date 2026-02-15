import {
  CmsEnv,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  STATE_COOKIE_NAME,
  buildOAuthCallbackHtml,
  clearCookie,
  createSessionCookieValue,
  exchangeCodeForToken,
  fetchGitHubLogin,
  getRequiredEnv,
  isSecureRequest,
  isValidProvider,
  parseAllowedUsers,
  parseCookies,
  serializeCookie,
  verifyStateCookieValue,
} from "../_lib/cms-auth.ts";

interface FunctionContext {
  request: Request;
  env: CmsEnv;
}

function htmlResponse(statusCode: number, html: string, cookies: string[] = []): Response {
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  for (const cookie of cookies) {
    headers.append("Set-Cookie", cookie);
  }
  return new Response(html, { status: statusCode, headers });
}

function oauthError(message: string, cookies: string[] = []): Response {
  return htmlResponse(400, buildOAuthCallbackHtml("error", { error: message }), cookies);
}

export const onRequestGet = async ({ request, env }: FunctionContext): Promise<Response> => {
  const url = new URL(request.url);
  const secure = isSecureRequest(request);
  const provider = url.searchParams.get("provider");
  if (!isValidProvider(provider)) {
    return oauthError("Invalid provider");
  }

  let sessionSecret: string;
  let clientId: string;
  let clientSecret: string;
  try {
    sessionSecret = getRequiredEnv(env, "CMS_SESSION_SECRET");
    clientId = getRequiredEnv(env, "GITHUB_CLIENT_ID");
    clientSecret = getRequiredEnv(env, "GITHUB_CLIENT_SECRET");
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth configuration is invalid";
    return oauthError(message);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return oauthError("Missing code or state");
  }

  const cookies = parseCookies(request);
  const stateCookie = cookies[STATE_COOKIE_NAME];
  if (!stateCookie) {
    return oauthError("Missing OAuth state cookie", [clearCookie(STATE_COOKIE_NAME, "/api", secure)]);
  }

  const statePayload = await verifyStateCookieValue(stateCookie, sessionSecret);
  if (!statePayload || statePayload.state !== state) {
    return oauthError("Invalid OAuth state", [clearCookie(STATE_COOKIE_NAME, "/api", secure)]);
  }

  try {
    const token = await exchangeCodeForToken(code, url.origin, clientId, clientSecret);
    const login = await fetchGitHubLogin(token);
    const allowList = parseAllowedUsers(env);
    if (allowList.size > 0 && !allowList.has(login)) {
      return oauthError(
        `GitHub user "${login}" is not allowed to access this admin`,
        [clearCookie(STATE_COOKIE_NAME, "/api", secure)],
      );
    }

    const sessionCookieValue = await createSessionCookieValue(token, login, sessionSecret);
    const successHtml = buildOAuthCallbackHtml("success", { token });

    return htmlResponse(200, successHtml, [
      serializeCookie(SESSION_COOKIE_NAME, sessionCookieValue, {
        path: "/api",
        httpOnly: true,
        secure,
        sameSite: "Lax",
        maxAge: SESSION_TTL_SECONDS,
      }),
      clearCookie(STATE_COOKIE_NAME, "/api", secure),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth callback failed";
    return oauthError(message, [clearCookie(STATE_COOKIE_NAME, "/api", secure)]);
  }
};
