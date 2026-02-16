# Releasing

## GitHub-first release flow

1. Push the subtree branch to a public repository:

```bash
git subtree split --prefix packages/anocus -b anocus-release
git push <public-remote> anocus-release:main
```

2. Create a GitHub release tag (for example: `v0.1.0`).
3. Update `README.md` quick start if APIs changed.

## Optional npm release later

This package is source-first and can be published after adding a build step for JS bundles.
