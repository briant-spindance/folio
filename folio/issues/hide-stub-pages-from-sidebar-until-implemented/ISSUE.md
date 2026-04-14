---
created: "2026-04-14"
modified: "2026-04-14"
priority: low
status: open
title: Hide stub pages from sidebar until implemented
type: improvement
---
## Description

Three routes in the web UI render a `StubPage` component that only displays a title and "This section is coming soon." All three are linked in the sidebar navigation, making them user-visible:

| Route | Sidebar Label |
|-------|---------------|
| `/sprints` | Sprints |
| `/review` | Review Tools |
| `/configuration` | Configuration |

Users can click these links and see no useful content.

## Recommendation

Either:

1. **Hide from sidebar** -- Remove the nav links until the features are implemented. The routes can remain for direct URL access.
2. **Feature flag** -- Gate the sidebar links behind a config option so they only appear during development.
3. **Better stub content** -- At minimum, replace "coming soon" with a brief description of what the feature will do and link to relevant roadmap items.

## Files

- `frontend/src/pages/StubPage.tsx` -- the stub component
- `frontend/src/App.tsx` -- route definitions (lines ~60-62)
- Sidebar component with nav links
