import { handleThreadRequest } from "../../../packages/anocus/adapters/cloudflare.ts";

export const onRequestGet = handleThreadRequest;
export const onRequestOptions = handleThreadRequest;
