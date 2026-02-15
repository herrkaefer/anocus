import { CmsEnv, getRequiredEnv, readSessionFromRequest } from "../_lib/cms-auth.ts";

interface FunctionContext {
  request: Request;
  env: CmsEnv;
}

function jsonResponse(statusCode: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function handleRequest({ request, env }: FunctionContext): Promise<Response> {
  try {
    const sessionSecret = getRequiredEnv(env, "CMS_SESSION_SECRET");
    const session = await readSessionFromRequest(request, sessionSecret);
    if (!session) {
      return jsonResponse(401, { error: "unauthenticated" });
    }

    return jsonResponse(200, {
      login: session.login,
      token: session.token,
      expires_at: new Date(session.exp).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read token";
    return jsonResponse(500, { error: message });
  }
}

export const onRequestGet = handleRequest;
export const onRequestPost = handleRequest;
