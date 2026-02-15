# Admin CMS Setup (Hugo + Cloudflare Pages)

This project uses Decap CMS at `/admin/` and GitHub OAuth via Cloudflare Pages Functions.

## 1. Create a GitHub OAuth App

1. Go to GitHub Settings -> Developer settings -> OAuth Apps -> New OAuth App.
2. Set:
   - Application name: `herrkaefer.com CMS` (or any name)
   - Homepage URL: `https://herrkaefer.com`
   - Authorization callback URL: `https://herrkaefer.com/api/callback`
3. Save the app and copy:
   - Client ID
   - Client Secret

## 2. Cloudflare Pages environment variables

Set these variables for the Pages project:

- `GITHUB_CLIENT_ID`: OAuth App client ID
- `GITHUB_CLIENT_SECRET`: OAuth App client secret
- `CMS_SESSION_SECRET`: long random secret used to sign cookies
- `CMS_ALLOWED_USERS`: comma-separated GitHub usernames allowed to access admin (example: `herrkaefer`)
- `CMS_OAUTH_SCOPES` (optional): defaults to `repo,user`

## 3. Verify branch and repo access

- Decap config is pinned to:
  - repo: `herrkaefer/herrkaefer.com`
  - branch: `main`
- Ensure the OAuth user has write access to this repo and branch.

## 4. Validate end-to-end flow

1. Open `https://herrkaefer.com/admin/`
2. Log in with GitHub.
3. Create/edit/delete a post in `content/posts/`.
4. Upload an image and confirm it lands in `static/assets/images/`.
5. Confirm commit appears in GitHub and Cloudflare Pages deploy is triggered.

## 5. Routes added

- `/admin/` (Decap CMS)
- `/api/auth` (OAuth start)
- `/api/callback` (OAuth callback)
- `/api/token` (debug/session token introspection)
- `/api/logout` (clear CMS session cookie)
