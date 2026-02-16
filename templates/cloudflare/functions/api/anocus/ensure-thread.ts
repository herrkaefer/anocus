import { handleEnsureThreadRequest } from "../../../../../adapters/cloudflare.ts";

export const onRequestPost = handleEnsureThreadRequest;
export const onRequestOptions = handleEnsureThreadRequest;
