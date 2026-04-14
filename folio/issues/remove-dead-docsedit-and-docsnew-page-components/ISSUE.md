---
created: "2026-04-14"
modified: "2026-04-14"
priority: low
status: open
title: Remove dead DocsEdit and DocsNew page components
type: chore
---
## Description

`frontend/src/pages/DocsEdit.tsx` and `frontend/src/pages/DocsNew.tsx` exist but are dead code:

- Neither file is imported or referenced anywhere in the codebase
- No routes are registered for them in `App.tsx` (unlike features, issues, and wiki which all have `/new` and `/:slug/edit` routes)
- Both files incorrectly reference **wiki** hooks (`useWikiDoc`, `useSaveWikiDoc`, `useCreateWikiDoc`) instead of project-doc hooks

These appear to have been copied from the wiki implementation as scaffolding but were never adapted for project docs.

## Recommendation

Delete both files. When project docs editing is implemented, start fresh with proper project-doc hooks and API endpoints rather than building on incorrectly wired code.

## Files

- `frontend/src/pages/DocsEdit.tsx`
- `frontend/src/pages/DocsNew.tsx`
