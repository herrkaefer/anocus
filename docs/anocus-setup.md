# Anocus Setup (Hugo + Cloudflare Pages)

This project includes Anocus, an anonymous comment component with Turnstile support.

## 1. Frontend config (`hugo.toml`)

```toml
[params.anocus]
  enabled = true
  api_base = '/api/anocus'
  turnstile_site_key = 'YOUR_TURNSTILE_SITE_KEY'
  max_length = 5000
  lang = 'en'
```

## 2. Cloudflare Pages environment variables

Required for all backends:
- `ANOCUS_STORAGE_BACKEND=github` or `kv`
- `ANOCUS_HMAC_SECRET`
- `ANOCUS_ALLOWED_ORIGIN` (example: `https://example.com`)
- `ANOCUS_TURNSTILE_SECRET_KEY`

Rate-limit controls:
- `ANOCUS_MAX_COMMENT_LENGTH` (default `5000`)
- `ANOCUS_MIN_SECONDS_BETWEEN_POSTS` (default `20`)
- `ANOCUS_MAX_POSTS_PER_HOUR` (default `20`)

### GitHub backend
- `ANOCUS_GITHUB_TOKEN`
- `ANOCUS_GITHUB_REPO_OWNER`
- `ANOCUS_GITHUB_REPO_NAME`
- `ANOCUS_GITHUB_CATEGORY_ID` or `ANOCUS_GITHUB_CATEGORY_NAME`

### KV backend
- `ANOCUS_STORAGE_BACKEND=kv`
- Bind KV namespace as `ANOCUS_KV`

## 3. API routes

- `GET /api/anocus/thread?pathname=/your/post/path`
- `POST /api/anocus/comment`

## 4. Rollback

Set in `hugo.toml`:

```toml
[params.anocus]
  enabled = false
```

Then the template falls back to `giscus` config.
