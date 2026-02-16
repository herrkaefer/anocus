import { handleCommentRequest } from "../../../packages/anocus/adapters/cloudflare.ts";

export const onRequestPost = handleCommentRequest;
export const onRequestOptions = handleCommentRequest;
