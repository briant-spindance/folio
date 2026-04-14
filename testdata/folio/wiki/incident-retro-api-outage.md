---
title: "Incident Retro: API Outage (April 5)"
modified: "2026-04-06"
icon: alert-triangle
order: 6
---

# Incident Retro: API Outage (April 5, 2026)

**Duration:** 45 minutes (14:10 – 14:55 UTC)  
**Severity:** P1  
**On-call:** Dan  
**Author:** Dan

## Summary

The `folio serve` command panicked on startup when the `wiki/` directory didn't exist in a freshly initialized project. Users who ran `folio init` followed by `folio serve` hit a nil pointer dereference in the wiki store's `ListAll()` method.

## Timeline

| Time | Event |
|------|-------|
| 14:10 | First bug report in GitHub Issues |
| 14:15 | Dan acknowledged, began investigating |
| 14:25 | Root cause identified: `os.ReadDir` on non-existent path |
| 14:35 | Fix merged to `main` (add `os.MkdirAll` guard) |
| 14:45 | New binary released via GoReleaser |
| 14:55 | Confirmed fix with reporter, issue closed |

## Root Cause

The wiki store assumed the `wiki/` directory always exists. The `folio init` command creates the directory structure but the wiki directory creation was missed when wiki support was added later. This is a consequence of our [[adr-001-markdown-storage|filesystem-based storage]] approach — every store needs to handle missing directories gracefully.

## What Went Well

- Fast detection: bug report came in within minutes of the broken release
- Quick fix: root cause was obvious from the stack trace
- [[deployment-runbook|Rollback process]] was clear and followed

## What Could Be Improved

- `folio doctor` should check that all expected directories exist
- We need a startup self-check before binding the HTTP port
- The [[onboarding-checklist]] should mention running `folio doctor` after init

## Action Items

- [x] Add `os.MkdirAll` guard to all store constructors
- [x] Add directory existence check to `folio doctor`
- [ ] Add integration test: `init` then `serve` on empty project
- [ ] Update [[onboarding-checklist]] to emphasize `folio doctor`
