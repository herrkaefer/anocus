import { AnocusRequestEnv } from "../server/types.ts";
import { AnocusService } from "../server/core.ts";
import { getRemoteIp, jsonResponse, textOrEmpty } from "../server/utils.ts";

interface CloudflareContext {
  request: Request;
  env: AnocusRequestEnv;
}

function withCors(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function handleThreadRequest({ request, env }: CloudflareContext): Promise<Response> {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }), origin);
  }
  const service = new AnocusService(env);

  if (!service.ensureOriginAllowed(origin)) {
    return withCors(jsonResponse(403, { error: "origin_not_allowed" }), origin);
  }

  const url = new URL(request.url);
  const pathname = textOrEmpty(url.searchParams.get("pathname"));
  if (!pathname) {
    return withCors(jsonResponse(400, { error: "pathname_required" }), origin);
  }

  try {
    const payload = await service.loadThread(pathname);
    return withCors(jsonResponse(200, payload), origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load thread";
    return withCors(jsonResponse(500, { error: message }), origin);
  }
}

export async function handleEnsureThreadRequest({ request, env }: CloudflareContext): Promise<Response> {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }), origin);
  }
  const service = new AnocusService(env);

  if (!service.ensureOriginAllowed(origin)) {
    return withCors(jsonResponse(403, { error: "origin_not_allowed" }), origin);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return withCors(jsonResponse(400, { error: "invalid_json" }), origin);
  }

  const pathname = textOrEmpty(body.pathname);
  const pageTitle = textOrEmpty(body.page_title || body.pageTitle);
  if (!pathname) {
    return withCors(jsonResponse(400, { error: "pathname_required" }), origin);
  }

  try {
    const payload = await service.ensureThread(pathname, pageTitle);
    return withCors(jsonResponse(200, payload), origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to ensure thread";
    return withCors(jsonResponse(400, { error: message }), origin);
  }
}

export async function handleCommentRequest({ request, env }: CloudflareContext): Promise<Response> {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }), origin);
  }
  const service = new AnocusService(env);

  if (!service.ensureOriginAllowed(origin)) {
    return withCors(jsonResponse(403, { error: "origin_not_allowed" }), origin);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return withCors(jsonResponse(400, { error: "invalid_json" }), origin);
  }

  const pathname = textOrEmpty(body.pathname);
  const pageTitle = textOrEmpty(body.page_title || body.pageTitle);
  const guestName = textOrEmpty(body.guest_name || body.guestName);
  const content = textOrEmpty(body.content);
  const turnstileToken = textOrEmpty(body.turnstile_token || body.turnstileToken);
  const parentCommentId = textOrEmpty(body.parent_comment_id || body.parentCommentId);

  if (!pathname || !guestName || !content) {
    return withCors(jsonResponse(400, { error: "pathname_guestName_content_required" }), origin);
  }

  try {
    const payload = await service.createComment(
      {
        pathname,
        pageTitle,
        guestName,
        content,
        parentCommentId: parentCommentId || undefined,
        remoteIp: getRemoteIp(request),
      },
      turnstileToken,
    );

    return withCors(jsonResponse(200, payload), origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create comment";
    const lower = message.toLowerCase();
    const status =
      lower.includes("rate") || lower.includes("too many requests") || lower.includes("limit reached") ? 429 : 400;
    return withCors(jsonResponse(status, { error: message }), origin);
  }
}
