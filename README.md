# Anocus

Anocus is a reusable anonymous comment component for static sites.

It provides:
- Anonymous comments (no GitHub login required for visitors)
- Threaded replies (comment reply)
- Cloudflare Turnstile human verification
- Pluggable storage backends
- `github`: GitHub Discussions
- `kv`: Cloudflare KV
- Cloudflare Pages Functions adapter

## Architecture

- `client/anocus.js` + `client/anocus.css`: embeddable frontend widget
- `server/*`: validation, anti-spam, storage adapters
- `adapters/cloudflare.ts`: request handlers for Pages Functions
- `templates/*`: copy-ready integration templates

## Quick Start (Hugo + Cloudflare Pages)

This is a source-first integration, no build step required.

### 1. Copy client assets to your site

Copy these files into your static assets:
- `client/anocus.js` -> `static/anocus/anocus.js`
- `client/anocus.css` -> `static/anocus/anocus.css`

### 2. Add API routes in Pages Functions

Create:
- `functions/api/anocus/thread.ts`
- `functions/api/anocus/comment.ts`

Use the templates from:
- `templates/cloudflare/functions/api/anocus/thread.ts`
- `templates/cloudflare/functions/api/anocus/comment.ts`

If you keep Anocus source in your repo (recommended), make imports point to your local copy of `adapters/cloudflare.ts`.

### 3. Add comment partial in Hugo

Use template:
- `templates/hugo/layouts/partials/comments.html`

Then render it from your single post template.

### 4. Configure Hugo params

```toml
[params.anocus]
  enabled = true
  api_base = '/api/anocus'
  turnstile_site_key = 'YOUR_TURNSTILE_SITE_KEY'
  max_length = 5000
  lang = 'en'
```

### 5. Configure Cloudflare environment variables

Required for all backends:
- `ANOCUS_STORAGE_BACKEND=github` or `kv`
- `ANOCUS_ALLOWED_ORIGIN=https://example.com`
- `ANOCUS_TURNSTILE_SECRET_KEY`

Optional anti-spam controls:
- `ANOCUS_MAX_COMMENT_LENGTH` (default `5000`)
- `ANOCUS_MIN_SECONDS_BETWEEN_POSTS` (default `20`)
- `ANOCUS_MAX_POSTS_PER_HOUR` (default `20`)

GitHub backend:
- `ANOCUS_GITHUB_TOKEN`
- `ANOCUS_GITHUB_REPO_OWNER`
- `ANOCUS_GITHUB_REPO_NAME`
- `ANOCUS_GITHUB_CATEGORY_ID` or `ANOCUS_GITHUB_CATEGORY_NAME`

KV backend:
- Bind KV namespace as `ANOCUS_KV`

## API

### `GET /api/anocus/thread?pathname=/post/path`

Returns:
- provider
- thread metadata (or `null` if not found yet)
- normalized comment list

### `POST /api/anocus/comment`

Body:
```json
{
  "pathname": "/post/path",
  "page_title": "Post title",
  "guest_name": "Alice",
  "content": "Hello",
  "parent_comment_id": "optional_parent_comment_id",
  "turnstile_token": "..."
}
```

## Security Model

- Turnstile token is verified server-side.
- Request origin can be restricted with `ANOCUS_ALLOWED_ORIGIN`.
- In-memory rate limits reduce spam bursts.

## Guest Identity Storage

By default, new comments are written to storage with a visible header block:
- `Name: ...`
- `---`

## License

MIT
