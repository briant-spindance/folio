---
title: Deployment Runbook
modified: "2026-04-12"
icon: rocket
order: 3
---

# Deployment Runbook

How we ship code to production. If this is your first deploy, read through [[onboarding-checklist]] first.

## Pre-Deploy Checklist

1. All CI checks are green on `main`
2. The changelog entry exists for the version
3. No open P0 issues (check the issues board)
4. You've read the diff since the last release tag

## Deploy Steps

```bash
# Tag the release
git tag -a v1.x.x -m "Release v1.x.x"
git push origin v1.x.x

# GoReleaser handles the rest via GitHub Actions
# Monitor the Actions tab for build completion
```

## Rollback

If something goes wrong:

```bash
# Revert to the previous release tag
git revert HEAD
git push origin main

# Or, for emergencies, point users to the previous binary
gh release download v1.x.previous -D /tmp/rollback
```

Document what happened following the format in [[incident-retro-api-outage]].

## Post-Deploy

- Smoke test the binary locally: `folio doctor`, `folio status`
- Check the GitHub release page for download counts
- Post in Slack: "v1.x.x shipped :ship:"
- Update [[meeting-notes-2026-04-07]] if the deploy was discussed in planning

## Environment Notes

We decided to keep things simple and avoid cloud infrastructure — see [[adr-002-local-first]] for the rationale. The binary is self-contained and runs on the user's machine. There is no server to deploy *to*, just a binary to distribute.
