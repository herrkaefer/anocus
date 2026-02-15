import { SESSION_COOKIE_NAME, STATE_COOKIE_NAME, clearCookie, isSecureRequest } from "../_lib/cms-auth.ts";

interface FunctionContext {
  request: Request;
}

function logoutResponse({ request }: FunctionContext): Response {
  const secure = isSecureRequest(request);
  const headers = new Headers({
    Location: "/admin/",
    "Cache-Control": "no-store",
  });
  headers.append("Set-Cookie", clearCookie(SESSION_COOKIE_NAME, "/api", secure));
  headers.append("Set-Cookie", clearCookie(STATE_COOKIE_NAME, "/api", secure));
  return new Response(null, { status: 302, headers });
}

export const onRequestGet = logoutResponse;
export const onRequestPost = logoutResponse;
