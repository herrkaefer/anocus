import {
  CmsEnv,
  STATE_COOKIE_NAME,
  buildGitHubAuthorizeUrl,
  createStateCookieValue,
  getOAuthScopes,
  getRequiredEnv,
  isSecureRequest,
  isValidProvider,
  randomHex,
  serializeCookie,
  STATE_TTL_SECONDS,
} from "../_lib/cms-auth.ts";

interface FunctionContext {
  request: Request;
  env: CmsEnv;
}

export const onRequestGet = async ({ request, env }: FunctionContext): Promise<Response> => {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  if (!isValidProvider(provider)) {
    return new Response("Invalid provider", { status: 400 });
  }

  try {
    const clientId = getRequiredEnv(env, "GITHUB_CLIENT_ID");
    const sessionSecret = getRequiredEnv(env, "CMS_SESSION_SECRET");
    const scope = getOAuthScopes(env);
    const state = randomHex(16);
    const stateCookie = await createStateCookieValue(state, sessionSecret);
    const location = buildGitHubAuthorizeUrl(url.origin, clientId, scope, state);
    const secure = isSecureRequest(request);

    const headers = new Headers();
    headers.set("Location", location);
    headers.append(
      "Set-Cookie",
      serializeCookie(STATE_COOKIE_NAME, stateCookie, {
        path: "/api",
        httpOnly: true,
        secure,
        sameSite: "Lax",
        maxAge: STATE_TTL_SECONDS,
      }),
    );
    headers.set("Cache-Control", "no-store");

    return new Response(null, { status: 302, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth initialization failed";
    return new Response(message, { status: 500 });
  }
};
