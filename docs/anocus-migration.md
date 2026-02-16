# Anocus Migration Notes

## Existing discussions

Anocus GitHub backend reads existing discussions by pathname title. This preserves current giscus threads when titles match page path.

## Existing comments

- Existing GitHub-authored comments are shown as `kind=github`.
- New anonymous comments are posted by bot account and rendered with guest metadata.

## Manual migration option

If a page thread is not matched automatically:
1. Create discussion with title exactly equal to page pathname (for example: `/2024/01/01/post`).
2. Copy old comments manually.
