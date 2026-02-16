import { handleCommentRequest } from "../../../../../adapters/cloudflare.ts";

export const onRequestPost = handleCommentRequest;
export const onRequestOptions = handleCommentRequest;
